import {
  fetchAllEvents as fetchAllKalshiEvents,
  type KalshiApiEvent,
  type KalshiApiMarket,
} from '../adapters/kalshi.client';
import {
  fetchAllMarkets as fetchAllMyriadMarkets,
  type MyriadApiMarket,
} from '../adapters/myriad.client';
import {
  fetchAllEvents as fetchAllPolyEvents,
  type PolyApiEvent,
  type PolyApiMarket,
} from '../adapters/polymarket.client';
import { config } from '../config';
import {
  getLogicalEventModel,
  getLogicalMarketModel,
  getVenueEventModel,
  getVenueMarketModel,
} from '../schemas';

type Status = 'open' | 'closed' | 'resolved';

function marketStatus(m: Pick<PolyApiMarket, 'active' | 'closed' | 'archived'>): Status {
  if (m.closed || m.archived) return 'closed';
  return 'open';
}

function eventCategory(e: PolyApiEvent): string {
  return e.slug?.split('-')[0] || 'general';
}

/**
 * Upsert one Polymarket event + all its child markets. An "event" in Polymarket
 * is the grouping unit the homepage renders — e.g. "2026 FIFA World Cup Winner"
 * with 60 team rows, or a standalone binary wrapped as a single-market event.
 *
 * Returns how many child markets were upserted (excluding skipped rows).
 */
async function upsertPolymarketEvent(e: PolyApiEvent): Promise<number> {
  if (!e.markets?.length) return 0;

  const LogicalMarket = getLogicalMarketModel();
  const VenueMarket = getVenueMarketModel();
  const LogicalEvent = getLogicalEventModel();
  const VenueEvent = getVenueEventModel();

  const now = Date.now();
  const logicalEventId = `polymarket-event-${e.id}`;
  const category = eventCategory(e);
  const mutuallyExclusive = e.negRisk === true;
  const eventEnd = e.endDate ? new Date(e.endDate) : null;
  const eventEndDate =
    eventEnd && !isNaN(eventEnd.getTime()) ? eventEnd : new Date('2099-12-31T00:00:00.000Z');

  const validChildMarketIds: string[] = [];
  const validChildSourceIds: string[] = [];
  let upserted = 0;

  for (const raw of e.markets) {
    const m = raw as PolyApiMarket;
    if (!m.clobTokenIds?.length || !m.outcomes?.length) continue;
    if (m.acceptingOrders === false || m.enableOrderBook === false) continue;
    if (m.closed || m.archived) continue;
    if (m.endDate) {
      const end = new Date(m.endDate).getTime();
      if (!isNaN(end) && end <= now) continue;
    }

    const logicalMarketId = `polymarket-${m.id}`;
    const status = marketStatus(m);

    const outcomeMap: Record<string, string> = {};
    const canonicalOutcomes = m.outcomes.map((label, i) => {
      const tokenId = m.clobTokenIds[i] ?? `${m.id}-${i}`;
      const canonicalId = `${logicalMarketId}-${i}`;
      outcomeMap[tokenId] = canonicalId;
      return { id: canonicalId, label };
    });

    const venueOutcomes = m.outcomes.map((label, i) => ({
      sourceOutcomeId: m.clobTokenIds[i] ?? `${m.id}-${i}`,
      label,
    }));

    const endDate = m.endDate ? new Date(m.endDate) : undefined;
    const validEndDate =
      endDate && !isNaN(endDate.getTime()) ? endDate : eventEndDate;

    await LogicalMarket.findByIdAndUpdate(
      logicalMarketId,
      {
        $set: {
          _id: logicalMarketId,
          title: m.question,
          category,
          endDate: validEndDate,
          status,
          quoteCurrency: 'USD',
          outcomes: canonicalOutcomes,
          venueMarkets: [{ venue: 'polymarket', sourceMarketId: m.id, outcomeMap }],
          eventId: logicalEventId,
          eventTitle: e.title,
          logicalEventId,
          groupItemTitle: m.groupItemTitle,
        },
      },
      { upsert: true },
    );

    const venueSet: Record<string, unknown> = {
      venue: 'polymarket',
      sourceMarketId: m.id,
      logicalMarketId,
      title: m.question,
      category,
      endDate: validEndDate,
      status,
      quoteCurrency: 'USD',
      outcomes: venueOutcomes,
      featured: m.featured,
      conditionId: m.conditionId,
      clobTokenIds: m.clobTokenIds,
      volume: m.volumeNum,
      liquidity: m.liquidityNum,
      logicalEventId,
      sourceEventId: e.id,
      groupItemTitle: m.groupItemTitle,
    };

    if (m.image) venueSet['image'] = m.image;
    if (m.icon) venueSet['icon'] = m.icon;
    if (m.description) venueSet['description'] = m.description;

    await VenueMarket.findOneAndUpdate(
      { venue: 'polymarket', sourceMarketId: m.id },
      { $set: venueSet },
      { upsert: true },
    );

    validChildMarketIds.push(logicalMarketId);
    validChildSourceIds.push(m.id);
    upserted++;
  }

  if (!validChildMarketIds.length) return 0;

  const eventStatus: Status = e.closed || e.archived ? 'closed' : 'open';

  await LogicalEvent.findByIdAndUpdate(
    logicalEventId,
    {
      $set: {
        _id: logicalEventId,
        title: e.title,
        slug: e.slug,
        description: e.description,
        image: e.image,
        icon: e.icon,
        category,
        endDate: eventEndDate,
        status: eventStatus,
        mutuallyExclusive,
        childMarketIds: validChildMarketIds,
        venues: ['polymarket'],
        volume24h: e.volume24hr ?? 0,
        volume: e.volume ?? 0,
        liquidity: e.liquidity ?? 0,
        featured: e.featured ?? false,
      },
    },
    { upsert: true },
  );

  await VenueEvent.findOneAndUpdate(
    { venue: 'polymarket', sourceEventId: e.id },
    {
      $set: {
        venue: 'polymarket',
        sourceEventId: e.id,
        logicalEventId,
        title: e.title,
        slug: e.slug,
        description: e.description,
        image: e.image,
        icon: e.icon,
        category,
        endDate: eventEndDate,
        status: eventStatus,
        mutuallyExclusive,
        childSourceMarketIds: validChildSourceIds,
        volume24h: e.volume24hr ?? 0,
        volume: e.volume ?? 0,
        liquidity: e.liquidity ?? 0,
        featured: e.featured ?? false,
      },
    },
    { upsert: true },
  );

  return upserted;
}

async function syncPolymarket(): Promise<void> {
  const events = await fetchAllPolyEvents(config.polyEventPageSize, config.polyMaxEvents);
  console.log(`[market-sync] fetched ${events.length} events from Polymarket`);

  let eventsUpserted = 0;
  let marketsUpserted = 0;
  for (const e of events) {
    const n = await upsertPolymarketEvent(e);
    if (n > 0) {
      eventsUpserted++;
      marketsUpserted += n;
    }
  }
  console.log(
    `[market-sync] polymarket: upserted ${eventsUpserted} events, ${marketsUpserted} markets`,
  );
}

function kalshiMarketStatus(m: KalshiApiMarket): Status {
  if (m.status === 'settled') return 'resolved';
  if (m.status === 'closed') return 'closed';
  return 'open';
}

// Kalshi's `status=open` filter returns markets whose response status is `"active"` (tradable).
function isKalshiOpen(status: string | undefined): boolean {
  return status === 'open' || status === 'active';
}

function kalshiCategory(e: KalshiApiEvent): string {
  if (e.category && e.category.trim()) return e.category.toLowerCase();
  const prefix = e.event_ticker.split('-')[0] ?? '';
  return prefix.toLowerCase() || 'general';
}

/**
 * Upsert one Kalshi event. Kalshi's event model is tighter than Polymarket:
 * `mutually_exclusive=true` is the "Who wins X?" grouping; false means a single
 * standalone binary under a generic event wrapper. We ingest both as events
 * (single-market events still render fine on the events page).
 *
 * Kalshi's /events?with_nested_markets=true returns prices in dollars (not cents)
 * in the nested `markets[*]`. The orderbook fetch still uses the cents API.
 */
async function upsertKalshiEvent(e: KalshiApiEvent): Promise<number> {
  if (!e.markets?.length) return 0;

  const LogicalMarket = getLogicalMarketModel();
  const VenueMarket = getVenueMarketModel();
  const LogicalEvent = getLogicalEventModel();
  const VenueEvent = getVenueEventModel();

  const now = Date.now();
  const logicalEventId = `kalshi-event-${e.event_ticker}`;
  const category = kalshiCategory(e);

  const validChildMarketIds: string[] = [];
  const validChildSourceIds: string[] = [];
  let maxCloseTime = 0;
  let eventStatus: Status = 'closed';
  let totalVolume = 0;
  let totalVolume24h = 0;
  let totalLiquidity = 0;
  let upserted = 0;

  for (const m of e.markets) {
    if (m.market_type && m.market_type !== 'binary') continue;
    const close = m.close_time ? new Date(m.close_time) : null;
    if (!close || isNaN(close.getTime()) || close.getTime() <= now) continue;
    if (!isKalshiOpen(m.status)) continue;
    // Defense against legacy parlay titles leaking in
    if (m.title.startsWith('yes ') || m.title.startsWith('no ')) continue;

    const logicalMarketId = `kalshi-${m.ticker}`;
    // In mutually-exclusive events, yes_sub_title is the candidate name (e.g. "Pope Tagle").
    // In standalone binaries, yes_sub_title is the "Yes" label; fall back to "Yes".
    const yesLabel = m.yes_sub_title?.trim() || 'Yes';
    const noLabel = m.no_sub_title?.trim() || 'No';
    const yesSourceId = `${m.ticker}-yes`;
    const noSourceId = `${m.ticker}-no`;
    const yesCanonical = `${logicalMarketId}-0`;
    const noCanonical = `${logicalMarketId}-1`;

    const canonicalOutcomes = [
      { id: yesCanonical, label: yesLabel },
      { id: noCanonical, label: noLabel },
    ];
    const venueOutcomes = [
      { sourceOutcomeId: yesSourceId, label: yesLabel },
      { sourceOutcomeId: noSourceId, label: noLabel },
    ];
    const outcomeMap: Record<string, string> = {
      [yesSourceId]: yesCanonical,
      [noSourceId]: noCanonical,
    };
    const status = kalshiMarketStatus(m);
    // For multi-outcome events the per-market "title" is usually the same question
    // repeated N times ("Who will the next Pope be?"); the yes_sub_title is what
    // identifies the row. Use a composed title so market cards don't collide.
    const childTitle =
      e.mutually_exclusive && m.yes_sub_title
        ? `${e.title.trim()} — ${m.yes_sub_title.trim()}`
        : m.title;

    const volumeFp =
      typeof m.volume_fp === 'number' ? m.volume_fp : Number(m.volume ?? 0);
    const volume24hFp =
      typeof m.volume_24h_fp === 'number' ? m.volume_24h_fp : Number(m.volume_24h ?? 0);
    const liquidity =
      typeof m.liquidity_dollars === 'number'
        ? m.liquidity_dollars
        : Number(m.liquidity ?? 0);

    await LogicalMarket.findByIdAndUpdate(
      logicalMarketId,
      {
        $set: {
          _id: logicalMarketId,
          title: childTitle,
          category,
          endDate: close,
          status,
          quoteCurrency: 'USD',
          outcomes: canonicalOutcomes,
          venueMarkets: [{ venue: 'kalshi', sourceMarketId: m.ticker, outcomeMap }],
          eventId: logicalEventId,
          eventTitle: e.title,
          logicalEventId,
          groupItemTitle: e.mutually_exclusive ? m.yes_sub_title : undefined,
        },
      },
      { upsert: true },
    );

    const venueSet: Record<string, unknown> = {
      venue: 'kalshi',
      sourceMarketId: m.ticker,
      logicalMarketId,
      title: childTitle,
      category,
      endDate: close,
      status,
      quoteCurrency: 'USD',
      outcomes: venueOutcomes,
      featured: false,
      volume: volumeFp,
      liquidity,
      logicalEventId,
      sourceEventId: e.event_ticker,
      groupItemTitle: e.mutually_exclusive ? m.yes_sub_title : undefined,
    };
    if (m.subtitle) venueSet['description'] = m.subtitle;

    await VenueMarket.findOneAndUpdate(
      { venue: 'kalshi', sourceMarketId: m.ticker },
      { $set: venueSet },
      { upsert: true },
    );

    validChildMarketIds.push(logicalMarketId);
    validChildSourceIds.push(m.ticker);
    totalVolume += volumeFp;
    totalVolume24h += volume24hFp;
    totalLiquidity += liquidity;
    if (close.getTime() > maxCloseTime) maxCloseTime = close.getTime();
    if (status === 'open') eventStatus = 'open';
    upserted++;
  }

  if (!validChildMarketIds.length) return 0;

  const endDate =
    maxCloseTime > 0 ? new Date(maxCloseTime) : new Date('2099-12-31T00:00:00.000Z');

  await LogicalEvent.findByIdAndUpdate(
    logicalEventId,
    {
      $set: {
        _id: logicalEventId,
        title: e.title,
        description: e.sub_title,
        category,
        endDate,
        status: eventStatus,
        mutuallyExclusive: e.mutually_exclusive ?? false,
        childMarketIds: validChildMarketIds,
        venues: ['kalshi'],
        volume24h: totalVolume24h,
        volume: totalVolume,
        liquidity: totalLiquidity,
        featured: false,
      },
    },
    { upsert: true },
  );

  await VenueEvent.findOneAndUpdate(
    { venue: 'kalshi', sourceEventId: e.event_ticker },
    {
      $set: {
        venue: 'kalshi',
        sourceEventId: e.event_ticker,
        logicalEventId,
        title: e.title,
        description: e.sub_title,
        category,
        endDate,
        status: eventStatus,
        mutuallyExclusive: e.mutually_exclusive ?? false,
        childSourceMarketIds: validChildSourceIds,
        volume24h: totalVolume24h,
        volume: totalVolume,
        liquidity: totalLiquidity,
        featured: false,
      },
    },
    { upsert: true },
  );

  return upserted;
}

async function syncKalshi(): Promise<void> {
  const events = await fetchAllKalshiEvents(
    config.kalshiEventPageSize,
    config.kalshiMaxEvents,
  );
  console.log(`[market-sync] fetched ${events.length} events from Kalshi`);

  let eventsUpserted = 0;
  let marketsUpserted = 0;
  for (const e of events) {
    const n = await upsertKalshiEvent(e);
    if (n > 0) {
      eventsUpserted++;
      marketsUpserted += n;
    }
  }
  console.log(
    `[market-sync] kalshi: upserted ${eventsUpserted} events, ${marketsUpserted} markets`,
  );
}

// Myriad markets are AMM-based with quote tokens that vary per market/network:
// USDC, USD1 etc. for real markets; PTS (Myriad points) and similar for test
// networks. The aggregator assumes USD-denominated notionals, so we include
// only stablecoin-denominated markets.
const MYRIAD_STABLE_SYMBOLS = new Set([
  'USDC',
  'USDC.E',
  'USDBC',
  'USDT',
  'USD1',
  'DAI',
]);

function myriadMarketStatus(state: string): Status {
  if (state === 'resolved') return 'resolved';
  if (state === 'closed' || state === 'voided') return 'closed';
  return 'open';
}

function myriadCategory(topics: string[] | undefined): string {
  const first = topics?.[0]?.trim();
  return first ? first.toLowerCase() : 'general';
}

/**
 * Upsert one Myriad market. Myriad markets natively carry N outcomes (binary
 * or multi-way), so we model each as a single-child logical event, mirroring
 * how standalone binaries are wrapped on Polymarket/Kalshi.
 *
 * sourceMarketId is composed as `${networkId}:${id}` so the orderbook and
 * price syncs can round-trip back to the (id, network_id) pair the Myriad
 * API requires.
 */
async function upsertMyriadMarket(m: MyriadApiMarket): Promise<boolean> {
  if (!m.outcomes?.length) return false;
  if (m.state !== 'open') return false;
  if (!MYRIAD_STABLE_SYMBOLS.has(m.token?.symbol?.toUpperCase() ?? '')) {
    return false;
  }
  const expires = m.expiresAt ? new Date(m.expiresAt) : null;
  if (!expires || isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
    return false;
  }

  const LogicalMarket = getLogicalMarketModel();
  const VenueMarket = getVenueMarketModel();
  const LogicalEvent = getLogicalEventModel();
  const VenueEvent = getVenueEventModel();

  const sourceMarketId = `${m.networkId}:${m.id}`;
  const logicalMarketId = `myriad-${sourceMarketId}`;
  const logicalEventId = `myriad-event-${sourceMarketId}`;
  const category = myriadCategory(m.topics);
  const status = myriadMarketStatus(m.state);

  const outcomeMap: Record<string, string> = {};
  const canonicalOutcomes = m.outcomes.map((o, i) => {
    const sourceOutcomeId = String(o.id);
    const canonicalId = `${logicalMarketId}-${i}`;
    outcomeMap[sourceOutcomeId] = canonicalId;
    return { id: canonicalId, label: o.title };
  });
  const venueOutcomes = m.outcomes.map((o) => ({
    sourceOutcomeId: String(o.id),
    label: o.title,
  }));

  await LogicalMarket.findByIdAndUpdate(
    logicalMarketId,
    {
      $set: {
        _id: logicalMarketId,
        title: m.title,
        category,
        endDate: expires,
        status,
        quoteCurrency: 'USD',
        outcomes: canonicalOutcomes,
        venueMarkets: [
          { venue: 'myriad', sourceMarketId, outcomeMap },
        ],
        eventId: logicalEventId,
        eventTitle: m.title,
        logicalEventId,
        groupItemTitle: undefined,
      },
    },
    { upsert: true },
  );

  const venueSet: Record<string, unknown> = {
    venue: 'myriad',
    sourceMarketId,
    logicalMarketId,
    title: m.title,
    category,
    endDate: expires,
    status,
    quoteCurrency: 'USD',
    outcomes: venueOutcomes,
    featured: m.featured ?? false,
    volume: m.volumeNotional ?? m.volume ?? 0,
    liquidity: m.liquidity ?? 0,
    logicalEventId,
    sourceEventId: sourceMarketId,
    groupItemTitle: undefined,
  };
  if (m.imageUrl) venueSet['image'] = m.imageUrl;
  if (m.description) venueSet['description'] = m.description;

  await VenueMarket.findOneAndUpdate(
    { venue: 'myriad', sourceMarketId },
    { $set: venueSet },
    { upsert: true },
  );

  await LogicalEvent.findByIdAndUpdate(
    logicalEventId,
    {
      $set: {
        _id: logicalEventId,
        title: m.title,
        slug: m.slug,
        description: m.description,
        image: m.imageUrl ?? undefined,
        category,
        endDate: expires,
        status,
        mutuallyExclusive: m.outcomes.length > 2,
        childMarketIds: [logicalMarketId],
        venues: ['myriad'],
        volume24h: m.volumeNotional24h ?? m.volume24h ?? 0,
        volume: m.volumeNotional ?? m.volume ?? 0,
        liquidity: m.liquidity ?? 0,
        featured: m.featured ?? false,
      },
    },
    { upsert: true },
  );

  await VenueEvent.findOneAndUpdate(
    { venue: 'myriad', sourceEventId: sourceMarketId },
    {
      $set: {
        venue: 'myriad',
        sourceEventId: sourceMarketId,
        logicalEventId,
        title: m.title,
        slug: m.slug,
        description: m.description,
        image: m.imageUrl ?? undefined,
        category,
        endDate: expires,
        status,
        mutuallyExclusive: m.outcomes.length > 2,
        childSourceMarketIds: [sourceMarketId],
        volume24h: m.volumeNotional24h ?? m.volume24h ?? 0,
        volume: m.volumeNotional ?? m.volume ?? 0,
        liquidity: m.liquidity ?? 0,
        featured: m.featured ?? false,
      },
    },
    { upsert: true },
  );

  return true;
}

async function syncMyriad(): Promise<void> {
  const markets = await fetchAllMyriadMarkets(
    config.myriadMarketPageSize,
    config.myriadMaxMarkets,
  );
  console.log(`[market-sync] fetched ${markets.length} markets from Myriad`);

  let upserted = 0;
  let skipped = 0;
  for (const m of markets) {
    const ok = await upsertMyriadMarket(m);
    if (ok) upserted++;
    else skipped++;
  }
  console.log(
    `[market-sync] myriad: upserted ${upserted} markets, skipped ${skipped}`,
  );
}

export async function runMarketSync(): Promise<void> {
  console.log('[market-sync] starting...');
  const venues = ['polymarket', 'kalshi', 'myriad'] as const;
  const results = await Promise.allSettled([
    syncPolymarket(),
    syncKalshi(),
    syncMyriad(),
  ]);
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(
        `[market-sync] ${venues[i]} failed:`,
        (r.reason as Error)?.message ?? r.reason,
      );
    }
  });
}

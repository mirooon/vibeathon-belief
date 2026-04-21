import { fetchAllMarkets, type PolyApiMarket } from '../adapters/polymarket.client';
import { config } from '../config';
import { getLogicalMarketModel, getVenueMarketModel } from '../schemas';

type Status = 'open' | 'closed' | 'resolved';

function toStatus(m: Pick<PolyApiMarket, 'active' | 'closed' | 'archived'>): Status {
  if (m.closed || m.archived) return 'closed';
  return 'open';
}

function deriveCategory(m: PolyApiMarket): string {
  const slug = m.events?.[0]?.slug ?? '';
  return slug.split('-')[0] || 'general';
}

export async function runMarketSync(): Promise<void> {
  console.log('[market-sync] starting...');
  const markets = await fetchAllMarkets(config.polyPageSize, config.polyMaxMarkets);
  console.log(`[market-sync] fetched ${markets.length} markets from Polymarket`);

  const LogicalMarket = getLogicalMarketModel();
  const VenueMarket = getVenueMarketModel();
  let upserted = 0;

  const now = Date.now();
  let skipped = 0;

  for (const m of markets) {
    if (!m.clobTokenIds?.length || !m.outcomes?.length) {
      skipped++;
      continue;
    }
    if (m.acceptingOrders === false || m.enableOrderBook === false) {
      skipped++;
      continue;
    }
    if (m.endDate) {
      const end = new Date(m.endDate).getTime();
      if (!isNaN(end) && end <= now) {
        skipped++;
        continue;
      }
    }

    const logicalMarketId = `polymarket-${m.id}`;
    const status = toStatus(m);
    const category = deriveCategory(m);
    const eventId = m.events?.[0]?.id ? `polymarket-event-${m.events[0].id}` : undefined;
    const eventTitle = m.events?.[0]?.title ?? undefined;
    const groupItemTitle = m.groupItemTitle ?? undefined;

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
    const validEndDate = endDate && !isNaN(endDate.getTime()) ? endDate : new Date('2099-12-31T00:00:00.000Z');

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
          ...(eventId ? { eventId } : {}),
          ...(eventTitle ? { eventTitle } : {}),
          ...(groupItemTitle ? { groupItemTitle } : {}),
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
    };

    if (m.image) venueSet['image'] = m.image;
    if (m.icon) venueSet['icon'] = m.icon;
    if (m.description) venueSet['description'] = m.description;

    await VenueMarket.findOneAndUpdate(
      { venue: 'polymarket', sourceMarketId: m.id },
      { $set: venueSet },
      { upsert: true },
    );

    upserted++;
  }

  console.log(`[market-sync] upserted ${upserted} markets (skipped ${skipped})`);
}

/**
 * Kalshi public trade API client.
 *
 * Read-only endpoints require no auth. Prices are returned as integer cents
 * (1-99); callers convert to 0-1 probabilities at the sync-layer boundary.
 */

const API_BASE =
  process.env['KALSHI_API_BASE'] ?? 'https://api.elections.kalshi.com/trade-api/v2';

export interface KalshiApiMarket {
  ticker: string;
  event_ticker: string;
  series_ticker?: string;
  market_type: 'binary' | 'categorical' | string;
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  status: 'unopened' | 'open' | 'closed' | 'settled' | string;
  open_time?: string;
  close_time: string;
  expiration_time?: string;
  // Legacy cents fields (returned by /markets)
  yes_bid?: number;
  yes_ask?: number;
  no_bid?: number;
  no_ask?: number;
  // Dollar fields (returned by /events?with_nested_markets=true)
  yes_bid_dollars?: number;
  yes_ask_dollars?: number;
  no_bid_dollars?: number;
  no_ask_dollars?: number;
  liquidity_dollars?: number;
  last_price?: number;
  volume?: number;
  volume_24h?: number;
  volume_fp?: number;
  volume_24h_fp?: number;
  liquidity?: number;
  open_interest?: number;
  category?: string;
  can_close_early?: boolean;
  response_price_units?: string;
}

/**
 * Kalshi event grouping — returned by /events?with_nested_markets=true.
 * `mutually_exclusive=true` identifies multi-outcome events like "Who will the
 * next Pope be?"; false events are single-market binary wrappers.
 */
export interface KalshiApiEvent {
  event_ticker: string;
  series_ticker?: string;
  title: string;
  sub_title?: string;
  category?: string;
  mutually_exclusive?: boolean;
  strike_period?: string;
  last_updated_ts?: string;
  markets: KalshiApiMarket[];
}

/** Raw orderbook: arrays of [price_cents, quantity]. `yes`/`no` may be null when empty. */
export interface KalshiOrderBook {
  yes: Array<[number, number]> | null;
  no: Array<[number, number]> | null;
}

interface MarketsResponse {
  markets: KalshiApiMarket[];
  cursor: string;
}

interface OrderBookResponse {
  orderbook: KalshiOrderBook;
}

export async function fetchMarketPage(
  cursor: string | null,
  limit: number,
): Promise<{ markets: KalshiApiMarket[]; cursor: string }> {
  const params = new URLSearchParams({
    status: 'open',
    limit: String(limit),
  });
  if (cursor) params.set('cursor', cursor);
  const url = `${API_BASE}/markets?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Kalshi /markets ${res.status} cursor=${cursor ?? 'start'}`);
  }
  const data = (await res.json()) as MarketsResponse;
  return { markets: data.markets ?? [], cursor: data.cursor ?? '' };
}

/**
 * Kalshi's /markets?status=open response is dominated (>99%) by "multi-vote event"
 * parlay markets under tickers like KXMVESPORTSMULTIGAMEEXTENDED-* and
 * KXMVECROSSCATEGORY-*. Their `title` field is a garbage concatenation
 * ("yes Boston,yes San Antonio,..."), not a real question. Skip them so the
 * maxMarkets budget reaches real markets.
 */
function isParlayTicker(ticker: string): boolean {
  return ticker.startsWith('KXMV');
}

export async function fetchAllMarkets(
  pageSize: number,
  maxMarkets: number,
): Promise<KalshiApiMarket[]> {
  const MAX_API_CALLS = 200;
  const kept: KalshiApiMarket[] = [];
  let cursor: string | null = null;
  let calls = 0;
  let filteredParlays = 0;
  for (;;) {
    if (kept.length >= maxMarkets) break;
    if (calls >= MAX_API_CALLS) {
      console.warn(
        `[kalshi.client] hit MAX_API_CALLS=${MAX_API_CALLS}, stopping with ${kept.length}/${maxMarkets} kept`,
      );
      break;
    }
    const page = await fetchMarketPage(cursor, pageSize);
    calls++;
    for (const m of page.markets) {
      if (isParlayTicker(m.ticker)) {
        filteredParlays++;
        continue;
      }
      kept.push(m);
      if (kept.length >= maxMarkets) break;
    }
    console.log(
      `[kalshi.client] page=${page.markets.length} kept=${kept.length} parlays_skipped=${filteredParlays}`,
    );
    if (!page.cursor || page.markets.length === 0) break;
    cursor = page.cursor;
  }
  return kept;
}

interface EventsResponse {
  events: KalshiApiEvent[];
  cursor: string;
}

async function fetchEventPage(
  cursor: string | null,
  limit: number,
): Promise<{ events: KalshiApiEvent[]; cursor: string }> {
  const params = new URLSearchParams({
    status: 'open',
    limit: String(limit),
    with_nested_markets: 'true',
  });
  if (cursor) params.set('cursor', cursor);
  const url = `${API_BASE}/events?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Kalshi /events ${res.status} cursor=${cursor ?? 'start'}`);
  }
  const data = (await res.json()) as EventsResponse;
  return { events: data.events ?? [], cursor: data.cursor ?? '' };
}

/**
 * Fetch Kalshi events with nested markets. Filters out:
 *  - Events whose sole markets are KXMV* parlay tickers (adapter-level defense
 *    against the multi-vote parlay dominance in the /markets endpoint).
 *
 * Note: /events doesn't suffer the same parlay-dominance problem as /markets
 * because parlays rarely form their own events — but we filter anyway for safety.
 */
export async function fetchAllEvents(
  pageSize: number,
  maxEvents: number,
): Promise<KalshiApiEvent[]> {
  const MAX_API_CALLS = 50;
  const kept: KalshiApiEvent[] = [];
  let cursor: string | null = null;
  let calls = 0;
  for (;;) {
    if (kept.length >= maxEvents) break;
    if (calls >= MAX_API_CALLS) {
      console.warn(
        `[kalshi.client] events hit MAX_API_CALLS=${MAX_API_CALLS}, stopping with ${kept.length}/${maxEvents}`,
      );
      break;
    }
    const page = await fetchEventPage(cursor, pageSize);
    calls++;
    for (const e of page.events) {
      const nonParlayMarkets = (e.markets ?? []).filter(
        (m) => !isParlayTicker(m.ticker),
      );
      if (nonParlayMarkets.length === 0) continue;
      kept.push({ ...e, markets: nonParlayMarkets });
      if (kept.length >= maxEvents) break;
    }
    console.log(
      `[kalshi.client] events page=${page.events.length} kept=${kept.length}`,
    );
    if (!page.cursor || page.events.length === 0) break;
    cursor = page.cursor;
  }
  return kept;
}

export async function fetchOrderBook(
  ticker: string,
  depth = 10,
): Promise<KalshiOrderBook> {
  const url = `${API_BASE}/markets/${encodeURIComponent(ticker)}/orderbook?depth=${depth}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Kalshi /orderbook ${res.status} ticker=${ticker}`);
  }
  const data = (await res.json()) as OrderBookResponse;
  return {
    yes: data.orderbook?.yes ?? null,
    no: data.orderbook?.no ?? null,
  };
}

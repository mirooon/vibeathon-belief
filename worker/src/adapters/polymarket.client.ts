const API_BASE = 'https://gamma-api.polymarket.com';
const CLOB_BASE = 'https://clob.polymarket.com';

export interface PolyApiMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  description: string;
  outcomes: string[];       // ["Yes", "No"]
  outcomePrices: string[];  // ["0.535", "0.465"]
  clobTokenIds: string[];   // one token ID per outcome
  endDate: string;
  startDate: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  acceptingOrders: boolean;
  enableOrderBook: boolean;
  featured: boolean;
  image: string;
  icon: string;
  // When a market is a row of a multi-outcome event (e.g. "Brazil" inside
  // "2026 World Cup Winner"), groupItemTitle is the row label. Standalone
  // binaries leave it undefined.
  groupItemTitle?: string;
  volumeNum: number;
  liquidityNum: number;
  lastTradePrice: number;
  bestBid: number;
  bestAsk: number;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    image: string;
    icon: string;
  }>;
}

/**
 * An event as returned by gamma-api /events — the grouping unit the Polymarket
 * homepage renders. Drives multi-outcome views ("Who wins the World Cup?" with
 * one row per team). `markets` is nested (no extra fetch needed).
 */
export interface PolyApiEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  featured?: boolean;
  liquidity?: number;
  volume?: number;
  volume24hr?: number;
  enableOrderBook?: boolean;
  // True for mutually-exclusive multi-outcome events like "Who wins X?".
  // Standalone binaries return negRisk=false and a single child market.
  negRisk?: boolean;
  markets: unknown[];
}

export interface ClobBookLevel {
  price: string;
  size: string;
}

export interface ClobBook {
  market: string;
  asset_id: string;
  bids: ClobBookLevel[];
  asks: ClobBookLevel[];
}

export interface ClobPriceHistory {
  history: Array<{ t: number; p: number }>;
}

// outcomes/outcomePrices/clobTokenIds sometimes come as JSON strings from the API
function parseJsonArray(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeMarket(raw: unknown): PolyApiMarket {
  const m = raw as Record<string, unknown>;
  return {
    ...(m as unknown as PolyApiMarket),
    outcomes: parseJsonArray(m['outcomes']),
    outcomePrices: parseJsonArray(m['outcomePrices']),
    clobTokenIds: parseJsonArray(m['clobTokenIds']),
  };
}

export async function fetchMarketPage(
  offset: number,
  limit = 100,
): Promise<PolyApiMarket[]> {
  const endDateMin = new Date().toISOString();
  const url =
    `${API_BASE}/markets?limit=${limit}&offset=${offset}` +
    `&closed=false&active=true&archived=false` +
    `&end_date_min=${encodeURIComponent(endDateMin)}` +
    `&order=volume24hr&ascending=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polymarket /markets ${res.status} at offset ${offset}`);
  const data = (await res.json()) as unknown[];
  return data.map(normalizeMarket);
}

export async function fetchAllMarkets(limit = 100, maxMarkets = Infinity): Promise<PolyApiMarket[]> {
  const all: PolyApiMarket[] = [];
  let offset = 0;
  for (;;) {
    const remaining = maxMarkets - all.length;
    if (remaining <= 0) break;
    const pageSize = Math.min(limit, remaining);
    const page = await fetchMarketPage(offset, pageSize);
    all.push(...page);
    console.log(`[polymarket.client] fetched page offset=${offset} size=${page.length} total=${all.length}`);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function fetchEventPage(
  offset: number,
  limit = 50,
): Promise<PolyApiEvent[]> {
  const endDateMin = new Date().toISOString();
  const url =
    `${API_BASE}/events?limit=${limit}&offset=${offset}` +
    `&closed=false&active=true&archived=false` +
    `&end_date_min=${encodeURIComponent(endDateMin)}` +
    `&order=volume24hr&ascending=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polymarket /events ${res.status} at offset ${offset}`);
  const data = (await res.json()) as unknown[];
  return data.map((raw) => {
    const e = raw as PolyApiEvent & { markets: unknown[] };
    return { ...e, markets: (e.markets ?? []).map(normalizeMarket) };
  });
}

export async function fetchAllEvents(
  limit = 50,
  maxEvents = Infinity,
): Promise<PolyApiEvent[]> {
  const all: PolyApiEvent[] = [];
  let offset = 0;
  for (;;) {
    const remaining = maxEvents - all.length;
    if (remaining <= 0) break;
    const pageSize = Math.min(limit, remaining);
    const page = await fetchEventPage(offset, pageSize);
    all.push(...page);
    console.log(
      `[polymarket.client] fetched events page offset=${offset} size=${page.length} total=${all.length}`,
    );
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function fetchOrderBook(clobTokenId: string): Promise<ClobBook> {
  const url = `${CLOB_BASE}/book?token_id=${clobTokenId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CLOB /book ${res.status} token=${clobTokenId}`);
  return (await res.json()) as ClobBook;
}

export async function fetchPriceHistory(clobTokenId: string): Promise<ClobPriceHistory> {
  const url = `${CLOB_BASE}/prices-history?market=${clobTokenId}&interval=max&fidelity=60`;
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`CLOB /prices-history ${res.status} token=${clobTokenId}`);
  return (await res.json()) as ClobPriceHistory;
}

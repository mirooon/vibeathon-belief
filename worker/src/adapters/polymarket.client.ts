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
  featured: boolean;
  image: string;
  icon: string;
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
  const url = `${API_BASE}/markets?limit=${limit}&offset=${offset}&closed=false&active=true&order=volume&ascending=false`;
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

/**
 * Myriad public REST API client (api-v2.myriadprotocol.com).
 *
 * Public endpoints: 30 req / 10s per IP (no auth). Markets are AMM-based — there
 * is no native order book, so the orderbook sync synthesizes levels by sampling
 * the POST /markets/quote endpoint at ascending notionals.
 *
 * Myriad identifies markets by (id, networkId) — a single numeric id is reused
 * across networks, so downstream code composes `sourceMarketId = "${networkId}:${id}"`
 * and splits it back when calling detail/quote endpoints.
 */

const API_BASE =
  process.env['MYRIAD_API_BASE'] ?? 'https://api-v2.myriadprotocol.com';

export interface MyriadApiOutcome {
  id: number;
  title: string;
  price: number;
  shares: number;
  sharesHeld: number;
  priceChange24h?: number;
  imageUrl?: string | null;
  tokenId?: string;
  price_charts?: Array<{
    timeframe: '24h' | '7d' | '30d' | 'all';
    prices: Array<{ value: number; timestamp: number; date: string }>;
  }>;
}

export interface MyriadApiToken {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
}

export interface MyriadApiMarket {
  id: number;
  networkId: number;
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  expiresAt: string;
  resolvesAt?: string | null;
  state: 'open' | 'closed' | 'resolved' | string;
  voided?: boolean;
  topics?: string[];
  token: MyriadApiToken;
  imageUrl?: string | null;
  bannerImageUrl?: string | null;
  liquidity?: number;
  liquidityPrice?: number;
  volume?: number;
  volume24h?: number;
  volumeNotional?: number;
  volumeNotional24h?: number;
  featured?: boolean;
  tradingModel?: 'amm' | string;
  outcomes: MyriadApiOutcome[];
  moneyline?: boolean;
}

export interface MyriadQuoteResponse {
  value: number;
  shares: number;
  shares_threshold: number;
  price_average: number;
  price_before: number;
  price_after: number;
  net_amount: number;
  fees?: { treasury?: number; distributor?: number; fee?: number };
}

export async function fetchMarketPage(
  page: number,
  limit: number,
): Promise<MyriadApiMarket[]> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    state: 'open',
    sort: 'volume_24h',
    order: 'desc',
  });
  const url = `${API_BASE}/markets?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Myriad /markets ${res.status} page=${page}`);
  }
  const data = (await res.json()) as { data?: MyriadApiMarket[] };
  return data.data ?? [];
}

export async function fetchAllMarkets(
  pageSize: number,
  maxMarkets: number,
): Promise<MyriadApiMarket[]> {
  const MAX_PAGES = 40;
  const all: MyriadApiMarket[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (all.length >= maxMarkets) break;
    const remaining = maxMarkets - all.length;
    const limit = Math.min(pageSize, remaining);
    const batch = await fetchMarketPage(page, limit);
    all.push(...batch);
    console.log(
      `[myriad.client] page=${page} got=${batch.length} total=${all.length}`,
    );
    if (batch.length < limit) break;
  }
  return all;
}

/**
 * Fetch a single market with price_charts attached to each outcome.
 * `id` here is the numeric Myriad market id; `networkId` is required for the
 * numeric-id variant of the endpoint.
 */
export async function fetchMarket(
  id: number,
  networkId: number,
): Promise<MyriadApiMarket> {
  const url = `${API_BASE}/markets/${id}?network_id=${networkId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Myriad /markets/${id} ${res.status} network=${networkId}`);
  }
  return (await res.json()) as MyriadApiMarket;
}

export async function fetchQuote(req: {
  marketId: number;
  networkId: number;
  outcomeId: number;
  action: 'buy' | 'sell';
  value: number;
  slippage?: number;
}): Promise<MyriadQuoteResponse> {
  const res = await fetch(`${API_BASE}/markets/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      market_id: req.marketId,
      network_id: req.networkId,
      outcome_id: req.outcomeId,
      action: req.action,
      value: req.value,
      slippage: req.slippage ?? 0.005,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Myriad /markets/quote ${res.status} market=${req.marketId} outcome=${req.outcomeId} ${req.action}`,
    );
  }
  return (await res.json()) as MyriadQuoteResponse;
}

/** Parse a composite sourceMarketId of the form "${networkId}:${id}". */
export function parseSourceMarketId(
  sourceMarketId: string,
): { networkId: number; id: number } | null {
  const [n, i] = sourceMarketId.split(':');
  const networkId = Number(n);
  const id = Number(i);
  if (!Number.isFinite(networkId) || !Number.isFinite(id)) return null;
  return { networkId, id };
}

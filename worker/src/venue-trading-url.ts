import type { PolyApiEvent, PolyApiMarket } from './adapters/polymarket.client';

const POLY_BASE = 'https://polymarket.com/event';

/**
 * Public Polymarket product URL for a market, from Gamma `event` + `market` slugs.
 * Neg-risk children often use `/event/{eventSlug}/{marketSlug}`; standalone
 * binaries typically use `/event/{marketSlug}`.
 */
export function buildPolymarketTradingUrl(e: PolyApiEvent, m: PolyApiMarket): string | undefined {
  const eventSlug = e.slug?.trim();
  const marketSlug = m.slug?.trim();
  if (marketSlug && eventSlug && e.negRisk && marketSlug !== eventSlug) {
    return `${POLY_BASE}/${encodeURI(eventSlug)}/${encodeURI(marketSlug)}`;
  }
  if (marketSlug) {
    return `${POLY_BASE}/${encodeURI(marketSlug)}`;
  }
  if (eventSlug) {
    return `${POLY_BASE}/${encodeURI(eventSlug)}`;
  }
  return undefined;
}

/**
 * Deep link to Kalshi's web app for a market ticker (e.g. KXINXD-25-YES).
 */
export function buildKalshiTradingUrl(ticker: string): string {
  return `https://trading.kalshi.com/market/${encodeURIComponent(ticker)}`;
}

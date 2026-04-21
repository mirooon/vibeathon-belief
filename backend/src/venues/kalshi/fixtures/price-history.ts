import type { PriceHistoryPoint } from "@vibeahack/shared";

const T = [
  "2026-03-17T12:00:00.000Z",
  "2026-03-24T12:00:00.000Z",
  "2026-03-31T12:00:00.000Z",
  "2026-04-07T12:00:00.000Z",
  "2026-04-14T12:00:00.000Z",
  "2026-04-21T12:00:00.000Z",
] as const;

function series(prices: readonly [number, number, number, number, number, number]): PriceHistoryPoint[] {
  return T.map((timestamp, i) => ({ timestamp, price: prices[i]! }));
}

export const KALSHI_PRICE_HISTORY: Record<string, PriceHistoryPoint[]> = {
  "kalshi-fifa-arg:kalshi_yes": series([0.32, 0.34, 0.35, 0.35, 0.36, 0.35]),
  "kalshi-fifa-arg:kalshi_no": series([0.66, 0.65, 0.63, 0.64, 0.63, 0.63]),
  "kalshi-fifa-fra:kalshi_yes": series([0.47, 0.49, 0.50, 0.51, 0.52, 0.525]),
  "kalshi-fifa-fra:kalshi_no": series([0.52, 0.50, 0.49, 0.48, 0.47, 0.465]),
  "kalshi-fifa-bra:kalshi_yes": series([0.30, 0.28, 0.27, 0.27, 0.26, 0.25]),
  "kalshi-fifa-bra:kalshi_no": series([0.68, 0.70, 0.72, 0.72, 0.73, 0.74]),
  "kalshi-midterm-house:kalshi_yes": series([0.46, 0.47, 0.48, 0.48, 0.49, 0.48]),
  "kalshi-midterm-house:kalshi_no": series([0.53, 0.52, 0.51, 0.51, 0.50, 0.51]),
  "kalshi-oil-price-2026:kalshi_yes": series([0.33, 0.35, 0.36, 0.37, 0.38, 0.39]),
  "kalshi-oil-price-2026:kalshi_no": series([0.67, 0.65, 0.64, 0.63, 0.62, 0.61]),
  "kalshi-fed-rate-cut-q2-2026:kalshi_yes": series([0.39, 0.40, 0.41, 0.42, 0.43, 0.44]),
  "kalshi-fed-rate-cut-q2-2026:kalshi_no": series([0.61, 0.60, 0.59, 0.58, 0.57, 0.56]),
};

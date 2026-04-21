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

export const POLYMARKET_PRICE_HISTORY: Record<string, PriceHistoryPoint[]> = {
  "poly-fifa-2026-winner:poly_arg": series([0.31, 0.33, 0.34, 0.34, 0.35, 0.35]),
  "poly-fifa-2026-winner:poly_fra": series([0.45, 0.47, 0.48, 0.49, 0.50, 0.51]),
  "poly-fifa-2026-winner:poly_bra": series([0.28, 0.27, 0.26, 0.26, 0.25, 0.25]),
  "poly-midterm-house:poly_yes": series([0.44, 0.45, 0.46, 0.46, 0.47, 0.47]),
  "poly-midterm-house:poly_no": series([0.56, 0.55, 0.54, 0.54, 0.53, 0.51]),
  "poly-btc-100k-2026:poly_yes": series([0.52, 0.54, 0.56, 0.57, 0.58, 0.59]),
  "poly-btc-100k-2026:poly_no": series([0.48, 0.46, 0.44, 0.43, 0.42, 0.41]),
  "poly-oil-price-2026:poly_yes": series([0.35, 0.36, 0.37, 0.38, 0.39, 0.40]),
  "poly-oil-price-2026:poly_no": series([0.65, 0.64, 0.63, 0.62, 0.61, 0.60]),
  "poly-fed-rate-cut-q2-2026:poly_yes": series([0.40, 0.41, 0.42, 0.43, 0.44, 0.45]),
  "poly-fed-rate-cut-q2-2026:poly_no": series([0.60, 0.59, 0.58, 0.57, 0.56, 0.55]),
  "poly-trump-tariff-eu-2026:poly_yes": series([0.55, 0.57, 0.59, 0.61, 0.62, 0.64]),
  "poly-trump-tariff-eu-2026:poly_no": series([0.45, 0.43, 0.41, 0.39, 0.38, 0.36]),
};

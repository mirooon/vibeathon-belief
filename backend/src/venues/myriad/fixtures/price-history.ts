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

export const MYRIAD_PRICE_HISTORY: Record<string, PriceHistoryPoint[]> = {
  "myriad-fifa-arg:myriad_yes": series([0.33, 0.34, 0.35, 0.36, 0.37, 0.37]),
  "myriad-fifa-arg:myriad_no": series([0.67, 0.66, 0.65, 0.64, 0.63, 0.63]),
  "myriad-fifa-fra:myriad_yes": series([0.49, 0.51, 0.52, 0.53, 0.54, 0.55]),
  "myriad-fifa-fra:myriad_no": series([0.51, 0.49, 0.48, 0.47, 0.46, 0.45]),
  "myriad-fifa-bra:myriad_yes": series([0.27, 0.26, 0.26, 0.25, 0.25, 0.24]),
  "myriad-fifa-bra:myriad_no": series([0.73, 0.74, 0.74, 0.75, 0.75, 0.76]),
  "myriad-trump-tariff-eu:myriad_yes": series([0.53, 0.56, 0.58, 0.60, 0.62, 0.63]),
  "myriad-trump-tariff-eu:myriad_no": series([0.47, 0.44, 0.42, 0.40, 0.38, 0.37]),
};

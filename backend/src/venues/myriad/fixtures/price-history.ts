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
  "myriad-fifa:myriad_arg": series([0.33, 0.34, 0.35, 0.36, 0.37, 0.37]),
  "myriad-fifa:myriad_fra": series([0.49, 0.51, 0.52, 0.53, 0.54, 0.55]),
  "myriad-fifa:myriad_bra": series([0.27, 0.26, 0.26, 0.25, 0.25, 0.24]),
};

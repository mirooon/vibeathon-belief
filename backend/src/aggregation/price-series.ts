import type { PriceHistoryPoint, Venue } from "@vibeahack/shared";
import { round4 } from "./rounding.js";

/**
 * Build a unified price series across venues.
 *
 * Phase 1: at each timestamp that appears in ANY venue's series, compute the
 * mean price of the venues that have a point exactly at that timestamp.
 * Future work: interpolation / nearest-neighbour when timestamps diverge.
 */
export function buildUnifiedPriceSeries(
  perVenue: Array<{ venue: Venue; points: PriceHistoryPoint[] }>,
): PriceHistoryPoint[] {
  const byTimestamp = new Map<string, number[]>();
  for (const { points } of perVenue) {
    for (const p of points) {
      const arr = byTimestamp.get(p.timestamp) ?? [];
      arr.push(p.price);
      byTimestamp.set(p.timestamp, arr);
    }
  }
  return [...byTimestamp.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, prices]) => ({
      timestamp,
      price: round4(prices.reduce((s, x) => s + x, 0) / prices.length),
    }));
}

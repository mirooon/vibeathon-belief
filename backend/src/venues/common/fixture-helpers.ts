import type {
  OrderBookLevel,
  PriceHistoryPoint,
  Venue,
} from "@vibeahack/shared";
import type {
  VenuePriceHistoryRange,
  VenueQuoteRequest,
  VenueQuoteResult,
} from "../venue-adapter.interface.js";

/**
 * Walk `levels` in order until `req.size` is filled.
 *
 * Assumes `levels` is already sorted in the correct walking order:
 *   - BUY walks `asks` ascending (best ask first).
 *   - SELL walks `bids` descending (best bid first).
 *
 * Partial fills are returned faithfully — unfilledSize > 0 is not an error.
 */
export function walkLevels(
  venue: Venue,
  req: VenueQuoteRequest,
  levels: ReadonlyArray<OrderBookLevel>,
  takerBps: number,
): VenueQuoteResult {
  let remaining = req.size;
  let filled = 0;
  let notional = 0;
  const fills: Array<{ price: number; size: number }> = [];

  for (const level of levels) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, level.size);
    if (take <= 0) continue;
    fills.push({ price: level.price, size: take });
    remaining -= take;
    filled += take;
    notional += take * level.price;
  }

  const avgPrice = filled > 0 ? notional / filled : 0;
  const fees = (notional * takerBps) / 10_000;

  return {
    venue,
    sourceMarketId: req.sourceMarketId,
    sourceOutcomeId: req.sourceOutcomeId,
    side: req.side,
    requestedSize: req.size,
    filledSize: filled,
    unfilledSize: req.size - filled,
    avgPrice,
    fees,
    fills,
  };
}

export function emptyQuoteResult(
  venue: Venue,
  req: VenueQuoteRequest,
): VenueQuoteResult {
  return {
    venue,
    sourceMarketId: req.sourceMarketId,
    sourceOutcomeId: req.sourceOutcomeId,
    side: req.side,
    requestedSize: req.size,
    filledSize: 0,
    unfilledSize: req.size,
    avgPrice: 0,
    fees: 0,
    fills: [],
  };
}

export function filterPriceHistoryRange(
  points: ReadonlyArray<PriceHistoryPoint>,
  range?: VenuePriceHistoryRange,
): PriceHistoryPoint[] {
  if (!range || (!range.from && !range.to)) return [...points];
  const fromMs = range.from ? Date.parse(range.from) : Number.NEGATIVE_INFINITY;
  const toMs = range.to ? Date.parse(range.to) : Number.POSITIVE_INFINITY;
  return points.filter((p) => {
    const t = Date.parse(p.timestamp);
    return t >= fromMs && t <= toMs;
  });
}

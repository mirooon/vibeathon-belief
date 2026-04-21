import {
  ALL_VENUES,
  type OrderBookLevel,
  type OrderSide,
  type QuoteRequest,
  type QuoteResponse,
  type QuoteRoute,
  type QuoteSplit,
  type Venue,
} from "@vibeahack/shared";
import type { VenueFeeConfig } from "../config/venue-fees.js";
import { round2, round4 } from "./rounding.js";

/**
 * Aggregation engine — pure functions, no I/O, no Nest/Mongo dependencies.
 *
 * §6a contract:
 *   - `routes[0].id === "optimal"` and `isOptimal: true`.
 *   - Exactly one optimal route per response.
 *   - For every venue with ANY depth for (outcome, side), there is one
 *     `single:<venue>` route — even if it cannot fully fill (`unfilledSize > 0`).
 *   - Venue order for single:<venue> routes follows ALL_VENUES (stable).
 *
 * Unit semantics:
 *   - `size` is in SHARES/CONTRACTS, not USD.
 *   - `price` is 0–1 probability.
 *   - USD notional for a fill = size × price.
 *   - `avgPrice` and `blendedPrice` rounded to 4 decimals.
 *   - `fees` (per split and total) rounded to 2 decimals (cents).
 *   - `estimatedSlippageBps` rounded to nearest integer bp, floor at 0.
 */

export interface BuildQuoteInput {
  logicalMarketId: string;
  request: QuoteRequest;
  perVenueLevels: Array<{ venue: Venue; levels: OrderBookLevel[] }>;
  feeConfig: Record<Venue, VenueFeeConfig>;
}

interface WalkOutcome {
  splits: QuoteSplit[];
  filledSize: number;
  unfilledSize: number;
  blendedPrice: number;
  totalFees: number;
  estimatedSlippageBps: number;
}

interface LevelWithVenue extends OrderBookLevel {
  venue: Venue;
  venueOrder: number;
}

function sortLevelsForSide(
  levels: LevelWithVenue[],
  side: OrderSide,
): LevelWithVenue[] {
  return [...levels].sort((a, b) => {
    if (a.price !== b.price) {
      return side === "buy" ? a.price - b.price : b.price - a.price;
    }
    return a.venueOrder - b.venueOrder;
  });
}

function computeSlippageBps(
  topOfBook: number,
  blendedPrice: number,
  side: OrderSide,
): number {
  if (topOfBook <= 0 || blendedPrice <= 0) return 0;
  const diff = side === "buy" ? blendedPrice - topOfBook : topOfBook - blendedPrice;
  return Math.max(0, Math.round((diff / topOfBook) * 10_000));
}

function walk(
  sortedLevels: LevelWithVenue[],
  size: number,
  side: OrderSide,
  feeConfig: Record<Venue, VenueFeeConfig>,
): WalkOutcome {
  let remaining = size;
  let filled = 0;
  let notional = 0;
  const perVenue = new Map<
    Venue,
    { size: number; notional: number; venueOrder: number }
  >();

  const topOfBook = sortedLevels[0]?.price ?? 0;

  for (const level of sortedLevels) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, level.size);
    if (take <= 0) continue;
    const entry = perVenue.get(level.venue) ?? {
      size: 0,
      notional: 0,
      venueOrder: level.venueOrder,
    };
    entry.size += take;
    entry.notional += take * level.price;
    perVenue.set(level.venue, entry);
    remaining -= take;
    filled += take;
    notional += take * level.price;
  }

  // Splits are emitted in execution order (first-filled first) — Map preserves
  // insertion order, which matches the fill order during the greedy walk.
  const splits: QuoteSplit[] = [...perVenue.entries()].map(
    ([venue, { size: vSize, notional: vNotional }]) => {
      const takerBps = feeConfig[venue]?.takerBps ?? 0;
      const fees = (vNotional * takerBps) / 10_000;
      const avgPrice = vSize > 0 ? vNotional / vSize : 0;
      return {
        venue,
        size: vSize,
        avgPrice: round4(avgPrice),
        fees: round2(fees),
      };
    },
  );

  const blendedPrice = filled > 0 ? round4(notional / filled) : 0;
  const totalFees = round2(splits.reduce((s, x) => s + x.fees, 0));
  const estimatedSlippageBps = computeSlippageBps(
    topOfBook,
    blendedPrice,
    side,
  );

  return {
    splits,
    filledSize: filled,
    unfilledSize: size - filled,
    blendedPrice,
    totalFees,
    estimatedSlippageBps,
  };
}

function venueOrderOf(venue: Venue): number {
  const i = ALL_VENUES.indexOf(venue);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function buildQuote(input: BuildQuoteInput): QuoteResponse {
  const { request, perVenueLevels, feeConfig } = input;

  const tagged: LevelWithVenue[] = [];
  const venuesWithDepth: Venue[] = [];

  for (const { venue, levels } of perVenueLevels) {
    const nonEmpty = levels.filter((l) => l.size > 0);
    if (nonEmpty.length === 0) continue;
    venuesWithDepth.push(venue);
    for (const level of nonEmpty) {
      tagged.push({ ...level, venue, venueOrder: venueOrderOf(venue) });
    }
  }

  const sorted = sortLevelsForSide(tagged, request.side);
  const optimal = walk(sorted, request.size, request.side, feeConfig);

  const optimalRoute: QuoteRoute = {
    id: "optimal",
    label: "Best blended price (split across venues)",
    isOptimal: true,
    ...optimal,
  };

  const singleRoutes: QuoteRoute[] = [];
  const venuesInStableOrder = [...venuesWithDepth].sort(
    (a, b) => venueOrderOf(a) - venueOrderOf(b),
  );
  for (const venue of venuesInStableOrder) {
    const levels = perVenueLevels.find((p) => p.venue === venue)?.levels ?? [];
    const venueLevels = levels
      .filter((l) => l.size > 0)
      .map((l) => ({
        ...l,
        venue,
        venueOrder: venueOrderOf(venue),
      }));
    const venueSorted = sortLevelsForSide(venueLevels, request.side);
    const result = walk(venueSorted, request.size, request.side, feeConfig);
    singleRoutes.push({
      id: `single:${venue}`,
      label: `${venue.charAt(0).toUpperCase()}${venue.slice(1)} only`,
      isOptimal: false,
      ...result,
    });
  }

  return {
    request: {
      logicalMarketId: input.logicalMarketId,
      outcomeId: request.outcomeId,
      side: request.side,
      size: request.size,
    },
    routes: [optimalRoute, ...singleRoutes],
  };
}

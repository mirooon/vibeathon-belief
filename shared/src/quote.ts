import { z } from "zod";
import { OrderSideSchema } from "./orderbook.js";
import { VenueSchema } from "./venue.js";

/**
 * User-facing quote request.
 *   size: shares/contracts the user wants to trade (not USD notional).
 *   USD cost = size × avgPrice, reported in QuoteSplit.
 */
export const QuoteRequestSchema = z.object({
  outcomeId: z.string().min(1),
  side: OrderSideSchema,
  size: z.number().positive(),
});
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;

/**
 * One venue's allocation within a route.
 *   avgPrice: weighted average fill price across the consumed book levels (0-1).
 *   fees:     USD fees for this allocation (computed from per-venue static takerBps).
 */
export const QuoteSplitSchema = z.object({
  venue: VenueSchema,
  size: z.number().min(0),
  avgPrice: z.number().min(0).max(1),
  fees: z.number().min(0),
});
export type QuoteSplit = z.infer<typeof QuoteSplitSchema>;

/**
 * A single executable route.
 *   id:           "optimal" | "single:polymarket" | "single:kalshi" | "single:myriad"
 *   isOptimal:    exactly one route per response has this true (id === "optimal").
 *   filledSize:   sum of splits[].size.
 *   unfilledSize: requested size - filledSize (≥ 0).
 *   blendedPrice: sum(size·avgPrice) / filledSize, rounded to 4 decimals.
 *                 If filledSize === 0, blendedPrice === 0.
 *   estimatedSlippageBps: (blendedPrice - topOfBook) / topOfBook × 10_000 for BUY;
 *                         symmetric for SELL. Rounded to nearest int bp.
 */
export const QuoteRouteSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  isOptimal: z.boolean(),
  splits: z.array(QuoteSplitSchema),
  filledSize: z.number().min(0),
  unfilledSize: z.number().min(0),
  blendedPrice: z.number().min(0).max(1),
  totalFees: z.number().min(0),
  estimatedSlippageBps: z.number().int().min(0),
});
export type QuoteRoute = z.infer<typeof QuoteRouteSchema>;

/**
 * /quote response.
 * Invariants (also enforced by the aggregation engine and asserted in tests):
 *   - routes[0].id === "optimal" && routes[0].isOptimal === true
 *   - exactly one route has isOptimal: true
 *   - for every venue with any depth for (outcomeId, side), a "single:<venue>" route
 *     exists even if that venue cannot fully fill (unfilledSize > 0).
 */
export const QuoteResponseSchema = z.object({
  request: z.object({
    logicalMarketId: z.string().min(1),
    outcomeId: z.string().min(1),
    side: OrderSideSchema,
    size: z.number().positive(),
  }),
  routes: z.array(QuoteRouteSchema),
});
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

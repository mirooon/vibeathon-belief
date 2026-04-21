import { z } from "zod";
import { VenueSchema } from "./venue.js";

/**
 * Sides. Convention:
 *   "buy"  = taker buys outcome shares (consumes asks, ascending price)
 *   "sell" = taker sells outcome shares (consumes bids, descending price)
 */
export const OrderSideSchema = z.enum(["buy", "sell"]);
export type OrderSide = z.infer<typeof OrderSideSchema>;

/**
 * A single price/size level.
 *   price: 0-1 probability (see Q4 — 0-1 decimals everywhere).
 *   size:  shares/contracts available at that price.
 */
export const OrderBookLevelSchema = z.object({
  price: z.number().min(0).max(1),
  size: z.number().min(0),
});
export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>;

/**
 * Per-outcome order book at one venue.
 *   bids: offers to BUY the outcome — sorted DESCENDING by price (best bid first).
 *   asks: offers to SELL the outcome — sorted ASCENDING by price (best ask first).
 */
export const OutcomeOrderBookSchema = z.object({
  canonicalOutcomeId: z.string().min(1),
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
});
export type OutcomeOrderBook = z.infer<typeof OutcomeOrderBookSchema>;

export const OrderBookSnapshotSchema = z.object({
  venue: VenueSchema,
  sourceMarketId: z.string().min(1),
  logicalMarketId: z.string().min(1),
  timestamp: z.string().datetime(),
  outcomes: z.array(OutcomeOrderBookSchema),
});
export type OrderBookSnapshot = z.infer<typeof OrderBookSnapshotSchema>;

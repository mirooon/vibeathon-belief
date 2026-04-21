import { z } from "zod";
import {
  MarketStatusSchema,
  OutcomeSchema,
  QuoteCurrencySchema,
} from "./market.js";
import { PriceHistoryPointSchema } from "./price-history.js";
import { VenueSchema } from "./venue.js";

/**
 * GET /markets — list item. One row per LogicalMarket.
 * bestAsk = lowest ask across all venues (cheapest buy); null if no venue has depth.
 * bestBid = highest bid across all venues (best sell); null if no venue has depth.
 */
export const MarketListOutcomeSchema = z.object({
  outcomeId: z.string().min(1),
  outcomeLabel: z.string().min(1),
  bestAsk: z.number().min(0).max(1).nullable(),
  bestBid: z.number().min(0).max(1).nullable(),
});
export type MarketListOutcome = z.infer<typeof MarketListOutcomeSchema>;

export const MarketListItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  endDate: z.string().datetime(),
  status: MarketStatusSchema,
  quoteCurrency: QuoteCurrencySchema,
  venues: z.array(VenueSchema).min(1),
  outcomes: z.array(MarketListOutcomeSchema).min(2),
  // Notional locked in the latest orderbook across all venues of this market, USD.
  tvl: z.number().min(0),
  // Trailing 24-hour notional traded, USD. Phase 1 is a deterministic stub derived
  // from market id + TVL (no trade stream is captured yet); replace once trade
  // history is ingested.
  volume24h: z.number().min(0),
  // negRisk / grouped-event fields (optional). Markets sharing the same eventId are
  // displayed as a single grouped card in the UI (Polymarket-style).
  eventId: z.string().optional(),
  eventTitle: z.string().optional(),
  groupItemTitle: z.string().optional(),
});
export type MarketListItem = z.infer<typeof MarketListItemSchema>;

export const MarketSortFieldSchema = z.enum(["endDate", "volume24h", "tvl"]);
export type MarketSortField = z.infer<typeof MarketSortFieldSchema>;

export const MarketSortOrderSchema = z.enum(["asc", "desc"]);
export type MarketSortOrder = z.infer<typeof MarketSortOrderSchema>;

export const MarketListResponseSchema = z.object({
  items: z.array(MarketListItemSchema),
  // Pagination placeholder (Phase 1 returns all markets; `cursor` present for API stability).
  cursor: z.string().nullable(),
});
export type MarketListResponse = z.infer<typeof MarketListResponseSchema>;

/**
 * GET /markets/:id — detail view.
 */
export const AggregatedBestPriceSchema = z.object({
  outcomeId: z.string().min(1),
  bestBid: z.number().min(0).max(1).nullable(),
  bestAsk: z.number().min(0).max(1).nullable(),
});
export type AggregatedBestPrice = z.infer<typeof AggregatedBestPriceSchema>;

export const VenueBreakdownOutcomeSchema = z.object({
  outcomeId: z.string().min(1),
  bestBid: z.number().min(0).max(1).nullable(),
  bestAsk: z.number().min(0).max(1).nullable(),
  bidDepth: z.number().min(0),
  askDepth: z.number().min(0),
});
export type VenueBreakdownOutcome = z.infer<typeof VenueBreakdownOutcomeSchema>;

export const VenueBreakdownSchema = z.object({
  venue: VenueSchema,
  sourceMarketId: z.string().min(1),
  outcomes: z.array(VenueBreakdownOutcomeSchema),
});
export type VenueBreakdown = z.infer<typeof VenueBreakdownSchema>;

export const OutcomePriceHistorySchema = z.object({
  outcomeId: z.string().min(1),
  unified: z.array(PriceHistoryPointSchema),
  perVenue: z.array(
    z.object({
      venue: VenueSchema,
      points: z.array(PriceHistoryPointSchema),
    }),
  ),
});
export type OutcomePriceHistory = z.infer<typeof OutcomePriceHistorySchema>;

export const MarketDetailSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  endDate: z.string().datetime(),
  status: MarketStatusSchema,
  quoteCurrency: QuoteCurrencySchema,
  outcomes: z.array(OutcomeSchema).min(2),
  aggregatedBestPrices: z.array(AggregatedBestPriceSchema),
  venueBreakdown: z.array(VenueBreakdownSchema),
  priceHistory: z.array(OutcomePriceHistorySchema),
});
export type MarketDetail = z.infer<typeof MarketDetailSchema>;

/**
 * GET /api/v1/health.
 */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  mongo: z.enum(["up", "down"]),
  uptimeSec: z.number().min(0),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

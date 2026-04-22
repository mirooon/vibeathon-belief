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
  /** Public web URL to open this market on the venue. Null/omitted when unknown. */
  tradingUrl: z.string().url().nullable().optional(),
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
 * GET /events — list item. One row per LogicalEvent.
 * Volume/liquidity aggregate child markets; bestAsk per outcome is the YES
 * best-ask of the corresponding child market (used for leaderboard rendering
 * in mutually-exclusive events like "Who wins X?").
 */
export const EventOutcomeRowSchema = z.object({
  childMarketId: z.string().min(1),
  label: z.string().min(1),
  // For mutually-exclusive events: the probability this row "wins" = YES-ask of child.
  // For non-ME events (standalone binaries) this is still the child's YES-ask.
  bestAsk: z.number().min(0).max(1).nullable(),
  bestBid: z.number().min(0).max(1).nullable(),
});
export type EventOutcomeRow = z.infer<typeof EventOutcomeRowSchema>;

export const EventListItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().optional(),
  image: z.string().url().optional(),
  icon: z.string().url().optional(),
  category: z.string().min(1),
  endDate: z.string().datetime(),
  status: MarketStatusSchema,
  mutuallyExclusive: z.boolean(),
  venues: z.array(VenueSchema).min(1),
  childMarketCount: z.number().int().min(1),
  // Top outcome rows for preview (capped at e.g. 4). Full list lives on detail.
  topOutcomes: z.array(EventOutcomeRowSchema),
  volume24h: z.number().min(0),
  liquidity: z.number().min(0),
  featured: z.boolean(),
});
export type EventListItem = z.infer<typeof EventListItemSchema>;

export const EventListResponseSchema = z.object({
  items: z.array(EventListItemSchema),
  cursor: z.string().nullable(),
});
export type EventListResponse = z.infer<typeof EventListResponseSchema>;

/**
 * GET /events/:id — full event detail with every child market's current prices.
 */
export const EventDetailOutcomeSchema = EventOutcomeRowSchema.extend({
  venue: VenueSchema,
  sourceMarketId: z.string().min(1),
  endDate: z.string().datetime(),
});
export type EventDetailOutcome = z.infer<typeof EventDetailOutcomeSchema>;

export const EventDetailSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  icon: z.string().url().optional(),
  category: z.string().min(1),
  endDate: z.string().datetime(),
  status: MarketStatusSchema,
  mutuallyExclusive: z.boolean(),
  venues: z.array(VenueSchema).min(1),
  outcomes: z.array(EventDetailOutcomeSchema),
  volume24h: z.number().min(0),
  volume: z.number().min(0),
  liquidity: z.number().min(0),
  featured: z.boolean(),
});
export type EventDetail = z.infer<typeof EventDetailSchema>;

/**
 * GET /api/v1/health.
 */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  mongo: z.enum(["up", "down"]),
  uptimeSec: z.number().min(0),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

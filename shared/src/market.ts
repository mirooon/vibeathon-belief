import { z } from "zod";
import { VenueSchema } from "./venue.js";

/**
 * Phase 1 treats USDC, USD, and any fiat-stable quote as a single unit ("USD").
 * Phase 2 may introduce true multi-currency handling; the field is present now so that
 * deviation is a value change, not a migration.
 */
export const QuoteCurrencySchema = z.literal("USD");
export type QuoteCurrency = z.infer<typeof QuoteCurrencySchema>;

export const MarketStatusSchema = z.enum(["open", "closed", "resolved"]);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

/**
 * Canonical outcome owned by a LogicalMarket.
 * Polymarket's multi-outcome "FIFA World Cup Winner" maps to N Outcomes here;
 * each Kalshi binary YES/NO contract maps 1→1 to a single Outcome (see Q1).
 */
export const OutcomeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export type Outcome = z.infer<typeof OutcomeSchema>;

/**
 * How a single venue market contributes to a logical market:
 * - venue + sourceMarketId identifies the venue-native market
 * - outcomeMap maps the venue's native outcome ids to canonical outcome ids
 *   (Kalshi binary markets map exactly one venue outcome; Polymarket multi-outcome
 *    markets map N).
 */
export const VenueMarketRefSchema = z.object({
  venue: VenueSchema,
  sourceMarketId: z.string().min(1),
  outcomeMap: z.record(z.string(), z.string()),
});
export type VenueMarketRef = z.infer<typeof VenueMarketRefSchema>;

/**
 * The canonical event the aggregator reasons about.
 * Produced in Phase 1 by the StaticSeededMatcher; in Phase 2, by an LLM title matcher.
 */
export const LogicalMarketSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  endDate: z.string().datetime(),
  status: MarketStatusSchema,
  quoteCurrency: QuoteCurrencySchema,
  outcomes: z.array(OutcomeSchema).min(2),
  venueMarkets: z.array(VenueMarketRefSchema).min(1),
});
export type LogicalMarket = z.infer<typeof LogicalMarketSchema>;

/**
 * A venue-native market as reported by its adapter. Prices are normalized to 0-1 at
 * the adapter boundary (Kalshi cents → decimals, etc.).
 */
export const VenueMarketOutcomeSchema = z.object({
  sourceOutcomeId: z.string().min(1),
  label: z.string().min(1),
});
export type VenueMarketOutcome = z.infer<typeof VenueMarketOutcomeSchema>;

export const VenueMarketSchema = z.object({
  venue: VenueSchema,
  sourceMarketId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  endDate: z.string().datetime(),
  status: MarketStatusSchema,
  quoteCurrency: QuoteCurrencySchema,
  outcomes: z.array(VenueMarketOutcomeSchema).min(2),
});
export type VenueMarket = z.infer<typeof VenueMarketSchema>;

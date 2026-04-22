import { z } from "zod";
import { MarketListItemSchema } from "./api-dto.js";
import { VenueSchema } from "./venue.js";

export const BeliefSearchRequestSchema = z.object({
  belief: z.string().min(3).max(500),
  limit: z.number().int().min(1).max(20).optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0),
});
export type BeliefSearchRequest = z.infer<typeof BeliefSearchRequestSchema>;
export type BeliefSearchRequestInput = z.input<typeof BeliefSearchRequestSchema>;

export const BeliefMatchSchema = z.object({
  market: MarketListItemSchema,
  score: z.number().min(0).max(1),
});
export type BeliefMatch = z.infer<typeof BeliefMatchSchema>;

export const BeliefSearchResponseSchema = z.object({
  belief: z.string(),
  matches: z.array(BeliefMatchSchema),
});
export type BeliefSearchResponse = z.infer<typeof BeliefSearchResponseSchema>;

/**
 * POST /belief/route — budget-sized routed bets for a natural-language belief.
 *
 * Input is a belief + USD budget. For each top-N (market, outcome) match, the
 * response returns the optimal cross-venue split sized by USD, not shares.
 */
export const BeliefRouteRequestSchema = z.object({
  belief: z.string().min(3).max(500),
  budgetUsd: z.number().positive().max(1_000_000),
  limit: z.number().int().min(1).max(10).optional().default(3),
  minScore: z.number().min(0).max(1).optional().default(0.3),
  /**
   * Override the outcome side for binary Yes/No markets. When omitted the
   * service auto-detects polarity from negation keywords in the belief text.
   */
  side: z.enum(["yes", "no"]).optional(),
});
export type BeliefRouteRequest = z.infer<typeof BeliefRouteRequestSchema>;
export type BeliefRouteRequestInput = z.input<typeof BeliefRouteRequestSchema>;

/**
 * One venue's allocation within a budget-sized route.
 *   sizeShares:  shares bought on this venue
 *   avgPrice:    weighted avg fill price (0–1)
 *   notionalUsd: sizeShares × avgPrice (ex-fees)
 *   fees:        USD taker fees for this allocation
 */
export const BudgetRouteSplitSchema = z.object({
  venue: VenueSchema,
  sizeShares: z.number().min(0),
  avgPrice: z.number().min(0).max(1),
  notionalUsd: z.number().min(0),
  fees: z.number().min(0),
});
export type BudgetRouteSplit = z.infer<typeof BudgetRouteSplitSchema>;

/**
 * A budget-sized optimal route across venues.
 *   filledNotionalUsd + totalFeesUsd === totalCostUsd (≤ budgetUsd)
 *   unfilledBudgetUsd = budgetUsd - totalCostUsd (≥ 0, > 0 when depth < budget)
 */
export const BudgetRouteSchema = z.object({
  splits: z.array(BudgetRouteSplitSchema),
  filledSizeShares: z.number().min(0),
  filledNotionalUsd: z.number().min(0),
  totalFeesUsd: z.number().min(0),
  totalCostUsd: z.number().min(0),
  unfilledBudgetUsd: z.number().min(0),
  blendedPrice: z.number().min(0).max(1),
  estimatedSlippageBps: z.number().int().min(0),
});
export type BudgetRoute = z.infer<typeof BudgetRouteSchema>;

export const BeliefRouteMatchSchema = z.object({
  score: z.number().min(0).max(1),
  market: MarketListItemSchema,
  outcome: z.object({
    outcomeId: z.string().min(1),
    outcomeLabel: z.string().min(1),
  }),
  route: BudgetRouteSchema,
});
export type BeliefRouteMatch = z.infer<typeof BeliefRouteMatchSchema>;

export const BeliefRouteResponseSchema = z.object({
  belief: z.string(),
  budgetUsd: z.number().positive(),
  matches: z.array(BeliefRouteMatchSchema),
});
export type BeliefRouteResponse = z.infer<typeof BeliefRouteResponseSchema>;

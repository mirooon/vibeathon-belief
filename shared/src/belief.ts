import { z } from "zod";
import { MarketListItemSchema } from "./api-dto.js";

export const BeliefSearchRequestSchema = z.object({
  belief: z.string().min(3).max(500),
  limit: z.number().int().min(1).max(20).optional().default(5),
});
export type BeliefSearchRequest = z.infer<typeof BeliefSearchRequestSchema>;

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

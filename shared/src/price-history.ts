import { z } from "zod";
import { VenueSchema } from "./venue.js";

export const PriceHistoryPointSchema = z.object({
  timestamp: z.string().datetime(),
  price: z.number().min(0).max(1),
});
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>;

/**
 * Per-outcome price history for one venue. The aggregation engine joins these
 * into a unified series by taking the min-ask-equivalent at each timestamp.
 */
export const VenuePriceHistorySchema = z.object({
  venue: VenueSchema,
  sourceMarketId: z.string().min(1),
  logicalMarketId: z.string().min(1),
  canonicalOutcomeId: z.string().min(1),
  points: z.array(PriceHistoryPointSchema),
});
export type VenuePriceHistory = z.infer<typeof VenuePriceHistorySchema>;

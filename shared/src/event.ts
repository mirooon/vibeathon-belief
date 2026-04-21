import { z } from "zod";
import { MarketStatusSchema } from "./market.js";
import { VenueSchema } from "./venue.js";

/**
 * A LogicalEvent groups related markets that share one real-world question.
 *
 * Polymarket's "2026 FIFA World Cup Winner" is one event with 60 child markets
 * (one per team). A Kalshi `mutually_exclusive` event like "Who will the next
 * Pope be?" is the same shape. A standalone binary ("Will Fed cut rates?") is
 * modeled as a single-child event so frontend rendering stays uniform.
 */
export const LogicalEventSchema = z.object({
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
  childMarketIds: z.array(z.string().min(1)),
  venues: z.array(VenueSchema).min(1),
  volume24h: z.number().min(0),
  volume: z.number().min(0),
  liquidity: z.number().min(0),
  featured: z.boolean(),
});
export type LogicalEvent = z.infer<typeof LogicalEventSchema>;

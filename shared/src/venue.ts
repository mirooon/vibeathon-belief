import { z } from "zod";

/**
 * Venues known to the Phase 1 aggregator.
 * Adding a venue: extend this enum, add an adapter under `backend/src/venues/<name>/`,
 * update the StaticSeededMatcher.
 */
export const VenueSchema = z.enum(["polymarket", "kalshi", "myriad"]);
export type Venue = z.infer<typeof VenueSchema>;

export const ALL_VENUES: readonly Venue[] = ["polymarket", "kalshi", "myriad"] as const;

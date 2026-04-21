import type { LogicalMarket, Venue } from "@vibeahack/shared";

/**
 * Seam between venue-native identifiers and the aggregator's canonical ones (§5a).
 * Phase 1 implementation = StaticSeededMatcher (hardcoded mappings).
 * Phase 2 will plug in an LlmTitleMatcher with identical signature.
 */
export interface VenueOutcomeRef {
  venue: Venue;
  sourceMarketId: string;
  sourceOutcomeId: string;
}

export interface MarketMatcher {
  getLogicalMarkets(): Promise<LogicalMarket[]>;

  getLogicalMarket(logicalMarketId: string): Promise<LogicalMarket | null>;

  /** Which logical market a given venue-native market belongs to, if any. */
  findByVenueMarket(
    venue: Venue,
    sourceMarketId: string,
  ): Promise<LogicalMarket | null>;

  /** Which (venue, sourceMarketId, sourceOutcomeId) triples implement a canonical outcome. */
  findVenueOutcomes(
    logicalMarketId: string,
    canonicalOutcomeId: string,
  ): Promise<VenueOutcomeRef[]>;
}

export const MARKET_MATCHER = Symbol("MARKET_MATCHER");

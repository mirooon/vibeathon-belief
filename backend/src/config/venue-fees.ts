import type { Venue } from "@vibeahack/shared";

/**
 * Per-venue taker fees (Q3).
 *   takerBps: basis points applied to notional USD = size × avgPrice.
 *   Fees in USD = notional × takerBps / 10_000.
 *
 * Phase 1 values are illustrative placeholders. Override via DI in tests if needed.
 */
export interface VenueFeeConfig {
  takerBps: number;
}

export const VENUE_FEES: Record<Venue, VenueFeeConfig> = {
  polymarket: { takerBps: 0 },
  kalshi: { takerBps: 200 },
  myriad: { takerBps: 100 },
};

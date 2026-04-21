import { Injectable } from "@nestjs/common";
import type { LogicalMarket, Venue } from "@vibeahack/shared";
import type {
  MarketMatcher,
  VenueOutcomeRef,
} from "./market-matcher.interface.js";

/**
 * Phase-1 matcher with hardcoded logicalMarketId assignments (§5a).
 *
 * Q1 — outcome model: `logicalMarket` owns canonical outcomes. A Polymarket
 * multi-outcome market maps 1→N; each Kalshi binary maps 1→1 (YES side only).
 * NO sides of Kalshi binaries appear in venue fixtures but intentionally have no
 * canonical counterpart in Phase 1 — the aggregator ignores unmapped outcomes.
 */
export const SEEDED_LOGICAL_MARKETS: LogicalMarket[] = [
  {
    id: "fifa-2026-winner",
    title: "2026 FIFA World Cup Winner",
    category: "sports",
    endDate: "2026-07-19T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { id: "argentina", label: "Argentina" },
      { id: "france", label: "France" },
      { id: "brazil", label: "Brazil" },
    ],
    venueMarkets: [
      {
        venue: "polymarket",
        sourceMarketId: "poly-fifa-2026-winner",
        outcomeMap: {
          poly_arg: "argentina",
          poly_fra: "france",
          poly_bra: "brazil",
        },
      },
      {
        venue: "kalshi",
        sourceMarketId: "kalshi-fifa-arg",
        outcomeMap: { kalshi_yes: "argentina" },
      },
      {
        venue: "kalshi",
        sourceMarketId: "kalshi-fifa-fra",
        outcomeMap: { kalshi_yes: "france" },
      },
      {
        venue: "kalshi",
        sourceMarketId: "kalshi-fifa-bra",
        outcomeMap: { kalshi_yes: "brazil" },
      },
      {
        venue: "myriad",
        sourceMarketId: "myriad-fifa",
        outcomeMap: {
          myriad_arg: "argentina",
          myriad_fra: "france",
          myriad_bra: "brazil",
        },
      },
    ],
  },
  {
    id: "midterm-2026-dems-house",
    title: "2026 US Midterms — Democrats retain the House",
    category: "politics",
    endDate: "2026-11-03T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    venueMarkets: [
      {
        venue: "polymarket",
        sourceMarketId: "poly-midterm-house",
        outcomeMap: { poly_yes: "yes", poly_no: "no" },
      },
      {
        venue: "kalshi",
        sourceMarketId: "kalshi-midterm-house",
        outcomeMap: { kalshi_yes: "yes", kalshi_no: "no" },
      },
    ],
  },
  {
    // Single-venue passthrough (§5b): only Polymarket lists this one.
    id: "btc-100k-2026",
    title: "Bitcoin above $100,000 by end of 2026",
    category: "crypto",
    endDate: "2026-12-31T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    venueMarkets: [
      {
        venue: "polymarket",
        sourceMarketId: "poly-btc-100k-2026",
        outcomeMap: { poly_yes: "yes", poly_no: "no" },
      },
    ],
  },
  {
    // Resolved market (§5b) — proves status filtering.
    id: "superbowl-2026-chiefs",
    title: "Super Bowl 2026 Winner — Kansas City Chiefs",
    category: "sports",
    endDate: "2026-02-08T23:59:59.999Z",
    status: "resolved",
    quoteCurrency: "USD",
    outcomes: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
    venueMarkets: [
      {
        venue: "polymarket",
        sourceMarketId: "poly-sb-chiefs",
        outcomeMap: { poly_yes: "yes", poly_no: "no" },
      },
      {
        venue: "kalshi",
        sourceMarketId: "kalshi-sb-chiefs",
        outcomeMap: { kalshi_yes: "yes", kalshi_no: "no" },
      },
    ],
  },
];

@Injectable()
export class StaticSeededMatcher implements MarketMatcher {
  private readonly logicalMarkets: LogicalMarket[] = SEEDED_LOGICAL_MARKETS;

  async getLogicalMarkets(): Promise<LogicalMarket[]> {
    return [...this.logicalMarkets];
  }

  async getLogicalMarket(id: string): Promise<LogicalMarket | null> {
    return this.logicalMarkets.find((m) => m.id === id) ?? null;
  }

  async findByVenueMarket(
    venue: Venue,
    sourceMarketId: string,
  ): Promise<LogicalMarket | null> {
    return (
      this.logicalMarkets.find((m) =>
        m.venueMarkets.some(
          (ref) =>
            ref.venue === venue && ref.sourceMarketId === sourceMarketId,
        ),
      ) ?? null
    );
  }

  async findVenueOutcomes(
    logicalMarketId: string,
    canonicalOutcomeId: string,
  ): Promise<VenueOutcomeRef[]> {
    const market = await this.getLogicalMarket(logicalMarketId);
    if (!market) return [];
    const refs: VenueOutcomeRef[] = [];
    for (const venueMarket of market.venueMarkets) {
      for (const [sourceOutcomeId, canonical] of Object.entries(
        venueMarket.outcomeMap,
      )) {
        if (canonical === canonicalOutcomeId) {
          refs.push({
            venue: venueMarket.venue,
            sourceMarketId: venueMarket.sourceMarketId,
            sourceOutcomeId,
          });
        }
      }
    }
    return refs;
  }
}

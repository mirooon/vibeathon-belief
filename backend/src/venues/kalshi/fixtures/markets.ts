import type { VenueMarket } from "@vibeahack/shared";

/**
 * Kalshi represents multi-outcome events (e.g. FIFA World Cup Winner) as multiple
 * independent binary YES/NO markets (one per candidate outcome). The matcher
 * maps each binary's YES side to a canonical outcome; NO sides are present in
 * fixtures for realism but are unmapped and ignored by the aggregator in Phase 1.
 */
export const KALSHI_MARKETS: VenueMarket[] = [
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fifa-arg",
    title: "Will Argentina win the 2026 FIFA World Cup?",
    category: "sports",
    endDate: "2026-07-19T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "kalshi_yes", label: "Yes" },
      { sourceOutcomeId: "kalshi_no", label: "No" },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fifa-fra",
    title: "Will France win the 2026 FIFA World Cup?",
    category: "sports",
    endDate: "2026-07-19T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "kalshi_yes", label: "Yes" },
      { sourceOutcomeId: "kalshi_no", label: "No" },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fifa-bra",
    title: "Will Brazil win the 2026 FIFA World Cup?",
    category: "sports",
    endDate: "2026-07-19T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "kalshi_yes", label: "Yes" },
      { sourceOutcomeId: "kalshi_no", label: "No" },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-midterm-house",
    title: "Will Democrats retain the US House in 2026?",
    category: "politics",
    endDate: "2026-11-03T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "kalshi_yes", label: "Yes" },
      { sourceOutcomeId: "kalshi_no", label: "No" },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-sb-chiefs",
    title: "Did the Kansas City Chiefs win Super Bowl 2026?",
    category: "sports",
    endDate: "2026-02-08T23:59:59.999Z",
    status: "resolved",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "kalshi_yes", label: "Yes" },
      { sourceOutcomeId: "kalshi_no", label: "No" },
    ],
  },
];

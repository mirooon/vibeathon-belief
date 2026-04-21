import type { VenueMarket } from "@vibeahack/shared";

export const MYRIAD_MARKETS: VenueMarket[] = [
  {
    venue: "myriad",
    sourceMarketId: "myriad-fifa",
    title: "Winner of the 2026 FIFA World Cup",
    category: "sports",
    endDate: "2026-07-19T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "myriad_arg", label: "Argentina" },
      { sourceOutcomeId: "myriad_fra", label: "France" },
      { sourceOutcomeId: "myriad_bra", label: "Brazil" },
    ],
  },
  {
    venue: "myriad",
    sourceMarketId: "myriad-trump-tariff-eu",
    title: "Will Trump impose 25%+ tariffs on EU in 2026?",
    category: "politics",
    endDate: "2026-12-31T23:59:59.999Z",
    status: "open",
    quoteCurrency: "USD",
    outcomes: [
      { sourceOutcomeId: "myriad_yes", label: "Yes" },
      { sourceOutcomeId: "myriad_no", label: "No" },
    ],
  },
];

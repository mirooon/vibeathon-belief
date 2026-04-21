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
];

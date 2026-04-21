import type { VenueOrderBookSnapshot } from "../../venue-adapter.interface.js";

const NOW = "2026-04-21T12:00:00.000Z";

export const MYRIAD_ORDER_BOOKS: VenueOrderBookSnapshot[] = [
  {
    venue: "myriad",
    sourceMarketId: "myriad-fifa",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "myriad_arg",
        bids: [
          { price: 0.32, size: 150 },
          { price: 0.30, size: 100 },
          { price: 0.28, size: 75 },
        ],
        asks: [
          { price: 0.38, size: 150 },
          { price: 0.40, size: 100 },
          { price: 0.42, size: 75 },
        ],
      },
      {
        // Canonical §6a case — single ask level of 300 @ 0.56.
        sourceOutcomeId: "myriad_fra",
        bids: [
          { price: 0.54, size: 250 },
          { price: 0.52, size: 150 },
          { price: 0.50, size: 80 },
        ],
        asks: [{ price: 0.56, size: 300 }],
      },
      {
        sourceOutcomeId: "myriad_bra",
        bids: [
          { price: 0.22, size: 150 },
          { price: 0.20, size: 100 },
          { price: 0.18, size: 75 },
        ],
        asks: [
          { price: 0.28, size: 150 },
          { price: 0.30, size: 100 },
          { price: 0.32, size: 75 },
        ],
      },
    ],
  },
];

import type { VenueOrderBookSnapshot } from "../../venue-adapter.interface.js";

const NOW = "2026-04-21T12:00:00.000Z";

/**
 * Polymarket order books.
 *
 * Note on the `poly_fra` outcome of `poly-fifa-2026-winner`: this is the canonical
 * §6a test case. Polymarket's ask side is intentionally a single level of 500 @ 0.51
 * so that single:polymarket at BUY 600 reports filledSize=500, unfilledSize=100.
 * Other outcomes and other markets have ≥3-level depth (§5b).
 */
export const POLYMARKET_ORDER_BOOKS: VenueOrderBookSnapshot[] = [
  {
    venue: "polymarket",
    sourceMarketId: "poly-fifa-2026-winner",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "poly_arg",
        bids: [
          { price: 0.34, size: 250 },
          { price: 0.32, size: 200 },
          { price: 0.30, size: 150 },
        ],
        asks: [
          { price: 0.36, size: 300 },
          { price: 0.38, size: 200 },
          { price: 0.40, size: 150 },
        ],
      },
      {
        // Canonical §6a case.
        sourceOutcomeId: "poly_fra",
        bids: [
          { price: 0.49, size: 400 },
          { price: 0.47, size: 200 },
          { price: 0.45, size: 100 },
        ],
        asks: [{ price: 0.51, size: 500 }],
      },
      {
        sourceOutcomeId: "poly_bra",
        bids: [
          { price: 0.24, size: 250 },
          { price: 0.22, size: 200 },
          { price: 0.20, size: 150 },
        ],
        asks: [
          { price: 0.26, size: 250 },
          { price: 0.28, size: 200 },
          { price: 0.30, size: 150 },
        ],
      },
    ],
  },
  {
    venue: "polymarket",
    sourceMarketId: "poly-midterm-house",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "poly_yes",
        bids: [
          { price: 0.46, size: 500 },
          { price: 0.44, size: 300 },
          { price: 0.42, size: 200 },
        ],
        asks: [
          { price: 0.48, size: 500 },
          { price: 0.50, size: 300 },
          { price: 0.52, size: 200 },
        ],
      },
      {
        sourceOutcomeId: "poly_no",
        bids: [
          { price: 0.50, size: 500 },
          { price: 0.48, size: 300 },
          { price: 0.46, size: 200 },
        ],
        asks: [
          { price: 0.52, size: 500 },
          { price: 0.54, size: 300 },
          { price: 0.56, size: 200 },
        ],
      },
    ],
  },
  {
    venue: "polymarket",
    sourceMarketId: "poly-btc-100k-2026",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "poly_yes",
        bids: [
          { price: 0.58, size: 600 },
          { price: 0.56, size: 400 },
          { price: 0.54, size: 250 },
        ],
        asks: [
          { price: 0.60, size: 600 },
          { price: 0.62, size: 400 },
          { price: 0.64, size: 250 },
        ],
      },
      {
        sourceOutcomeId: "poly_no",
        bids: [
          { price: 0.38, size: 600 },
          { price: 0.36, size: 400 },
          { price: 0.34, size: 250 },
        ],
        asks: [
          { price: 0.40, size: 600 },
          { price: 0.42, size: 400 },
          { price: 0.44, size: 250 },
        ],
      },
    ],
  },
  {
    venue: "polymarket",
    sourceMarketId: "poly-oil-price-2026",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "poly_yes",
        bids: [
          { price: 0.38, size: 400 },
          { price: 0.36, size: 250 },
          { price: 0.34, size: 150 },
        ],
        asks: [
          { price: 0.40, size: 400 },
          { price: 0.42, size: 250 },
          { price: 0.44, size: 150 },
        ],
      },
      {
        sourceOutcomeId: "poly_no",
        bids: [
          { price: 0.58, size: 400 },
          { price: 0.56, size: 250 },
          { price: 0.54, size: 150 },
        ],
        asks: [
          { price: 0.60, size: 400 },
          { price: 0.62, size: 250 },
          { price: 0.64, size: 150 },
        ],
      },
    ],
  },
  {
    venue: "polymarket",
    sourceMarketId: "poly-fed-rate-cut-q2-2026",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "poly_yes",
        bids: [
          { price: 0.43, size: 350 },
          { price: 0.41, size: 200 },
          { price: 0.39, size: 150 },
        ],
        asks: [
          { price: 0.45, size: 350 },
          { price: 0.47, size: 200 },
          { price: 0.49, size: 150 },
        ],
      },
      {
        sourceOutcomeId: "poly_no",
        bids: [
          { price: 0.53, size: 350 },
          { price: 0.51, size: 200 },
          { price: 0.49, size: 150 },
        ],
        asks: [
          { price: 0.55, size: 350 },
          { price: 0.57, size: 200 },
          { price: 0.59, size: 150 },
        ],
      },
    ],
  },
  {
    venue: "polymarket",
    sourceMarketId: "poly-trump-tariff-eu-2026",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "poly_yes",
        bids: [
          { price: 0.62, size: 500 },
          { price: 0.60, size: 300 },
          { price: 0.58, size: 200 },
        ],
        asks: [
          { price: 0.64, size: 500 },
          { price: 0.66, size: 300 },
          { price: 0.68, size: 200 },
        ],
      },
      {
        sourceOutcomeId: "poly_no",
        bids: [
          { price: 0.34, size: 500 },
          { price: 0.32, size: 300 },
          { price: 0.30, size: 200 },
        ],
        asks: [
          { price: 0.36, size: 500 },
          { price: 0.38, size: 300 },
          { price: 0.40, size: 200 },
        ],
      },
    ],
  },
  // `poly-sb-chiefs` is resolved — no live book.
];

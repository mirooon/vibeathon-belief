import type { VenueOrderBookSnapshot } from "../../venue-adapter.interface.js";

const NOW = "2026-04-21T12:00:00.000Z";

/**
 * Kalshi order books. Canonical §6a case lives on `kalshi-fifa-fra` / `kalshi_yes`:
 * single-level ask of 400 @ 0.535 so that single:kalshi at BUY 600 on the `france`
 * canonical outcome reports filledSize=400, unfilledSize=200. `kalshi-sb-chiefs`
 * is resolved and has no live book.
 */
export const KALSHI_ORDER_BOOKS: VenueOrderBookSnapshot[] = [
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fifa-arg",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "kalshi_yes",
        bids: [
          { price: 0.33, size: 200 },
          { price: 0.31, size: 150 },
          { price: 0.29, size: 100 },
        ],
        asks: [
          { price: 0.37, size: 200 },
          { price: 0.39, size: 150 },
          { price: 0.41, size: 100 },
        ],
      },
      {
        sourceOutcomeId: "kalshi_no",
        bids: [
          { price: 0.61, size: 200 },
          { price: 0.59, size: 150 },
          { price: 0.57, size: 100 },
        ],
        asks: [
          { price: 0.65, size: 200 },
          { price: 0.67, size: 150 },
          { price: 0.69, size: 100 },
        ],
      },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fifa-fra",
    timestamp: NOW,
    outcomes: [
      {
        // Canonical §6a case.
        sourceOutcomeId: "kalshi_yes",
        bids: [
          { price: 0.515, size: 350 },
          { price: 0.495, size: 200 },
          { price: 0.475, size: 100 },
        ],
        asks: [{ price: 0.535, size: 400 }],
      },
      {
        sourceOutcomeId: "kalshi_no",
        bids: [
          { price: 0.455, size: 300 },
          { price: 0.435, size: 200 },
          { price: 0.415, size: 100 },
        ],
        asks: [
          { price: 0.475, size: 400 },
          { price: 0.495, size: 200 },
          { price: 0.515, size: 100 },
        ],
      },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fifa-bra",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "kalshi_yes",
        bids: [
          { price: 0.23, size: 200 },
          { price: 0.21, size: 150 },
          { price: 0.19, size: 100 },
        ],
        asks: [
          { price: 0.27, size: 200 },
          { price: 0.29, size: 150 },
          { price: 0.31, size: 100 },
        ],
      },
      {
        sourceOutcomeId: "kalshi_no",
        bids: [
          { price: 0.71, size: 200 },
          { price: 0.69, size: 150 },
          { price: 0.67, size: 100 },
        ],
        asks: [
          { price: 0.75, size: 200 },
          { price: 0.77, size: 150 },
          { price: 0.79, size: 100 },
        ],
      },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-midterm-house",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "kalshi_yes",
        bids: [
          { price: 0.47, size: 400 },
          { price: 0.45, size: 300 },
          { price: 0.43, size: 200 },
        ],
        asks: [
          { price: 0.49, size: 400 },
          { price: 0.51, size: 300 },
          { price: 0.53, size: 200 },
        ],
      },
      {
        sourceOutcomeId: "kalshi_no",
        bids: [
          { price: 0.49, size: 400 },
          { price: 0.47, size: 300 },
          { price: 0.45, size: 200 },
        ],
        asks: [
          { price: 0.53, size: 400 },
          { price: 0.55, size: 300 },
          { price: 0.57, size: 200 },
        ],
      },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-oil-price-2026",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "kalshi_yes",
        bids: [
          { price: 0.36, size: 300 },
          { price: 0.34, size: 200 },
          { price: 0.32, size: 150 },
        ],
        asks: [
          { price: 0.39, size: 300 },
          { price: 0.41, size: 200 },
          { price: 0.43, size: 150 },
        ],
      },
      {
        sourceOutcomeId: "kalshi_no",
        bids: [
          { price: 0.59, size: 300 },
          { price: 0.57, size: 200 },
          { price: 0.55, size: 150 },
        ],
        asks: [
          { price: 0.61, size: 300 },
          { price: 0.63, size: 200 },
          { price: 0.65, size: 150 },
        ],
      },
    ],
  },
  {
    venue: "kalshi",
    sourceMarketId: "kalshi-fed-rate-cut-q2-2026",
    timestamp: NOW,
    outcomes: [
      {
        sourceOutcomeId: "kalshi_yes",
        bids: [
          { price: 0.41, size: 300 },
          { price: 0.39, size: 200 },
          { price: 0.37, size: 150 },
        ],
        asks: [
          { price: 0.44, size: 300 },
          { price: 0.46, size: 200 },
          { price: 0.48, size: 150 },
        ],
      },
      {
        sourceOutcomeId: "kalshi_no",
        bids: [
          { price: 0.54, size: 300 },
          { price: 0.52, size: 200 },
          { price: 0.50, size: 150 },
        ],
        asks: [
          { price: 0.57, size: 300 },
          { price: 0.59, size: 200 },
          { price: 0.61, size: 150 },
        ],
      },
    ],
  },
  // `kalshi-sb-chiefs` is resolved — no live book.
];

/**
 * VenueAdapter — the single boundary every prediction-market venue implements.
 *
 * Adapters speak venue-native: they know their own sourceMarketId and sourceOutcomeId,
 * and return prices normalized to 0-1 probabilities and sizes in shares/contracts.
 * Canonical identifiers (logicalMarketId, canonical outcome ids) live one layer up
 * in the aggregator, which consults the MarketMatcher to translate.
 *
 * Adapters MUST NOT depend on Mongo, Nest, or HTTP — they are pure data sources.
 * Phase 1 implementations read from JSON fixtures under
 * `backend/src/venues/<venue>/fixtures/`.
 *
 * Failure semantics:
 * - `getMarket` / `getOrderBook` return `null` when the sourceMarketId is unknown.
 *   This is a normal condition and MUST NOT throw.
 * - Any other failure (fixture parse error, I/O error, upstream venue outage in
 *   Phase 2) SHOULD throw. The aggregator treats a thrown adapter as an outage
 *   and omits that venue from the response; the whole /quote call does not fail.
 */

import type {
  OrderBookLevel,
  OrderSide,
  PriceHistoryPoint,
  Venue,
  VenueMarket,
} from "@vibeahack/shared";

/**
 * Per-outcome order book, keyed by the venue's native outcome id.
 * `bids` sorted DESCENDING by price; `asks` sorted ASCENDING by price.
 */
export interface VenueOutcomeBook {
  sourceOutcomeId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface VenueOrderBookSnapshot {
  venue: Venue;
  sourceMarketId: string;
  timestamp: string;
  outcomes: VenueOutcomeBook[];
}

export interface VenuePriceHistoryRange {
  from?: string;
  to?: string;
}

export interface VenueQuoteRequest {
  sourceMarketId: string;
  sourceOutcomeId: string;
  side: OrderSide;
  size: number;
}

/**
 * A venue's fill for a single-venue request.
 * `avgPrice` is the size-weighted fill price across `fills`; 0 if filledSize === 0.
 * `fees` is USD, computed from the adapter's configured takerBps (Q3).
 */
export interface VenueQuoteResult {
  venue: Venue;
  sourceMarketId: string;
  sourceOutcomeId: string;
  side: OrderSide;
  requestedSize: number;
  filledSize: number;
  unfilledSize: number;
  avgPrice: number;
  fees: number;
  fills: Array<{ price: number; size: number }>;
}

export interface VenueAdapter {
  readonly venue: Venue;

  listMarkets(): Promise<VenueMarket[]>;

  getMarket(sourceMarketId: string): Promise<VenueMarket | null>;

  getOrderBook(sourceMarketId: string): Promise<VenueOrderBookSnapshot | null>;

  getPriceHistory(
    sourceMarketId: string,
    sourceOutcomeId: string,
    range?: VenuePriceHistoryRange,
  ): Promise<PriceHistoryPoint[]>;

  quoteOrder(req: VenueQuoteRequest): Promise<VenueQuoteResult>;
}

/** DI token for NestJS to inject the array of all venue adapters. */
export const VENUE_ADAPTERS = Symbol("VENUE_ADAPTERS");

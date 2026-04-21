import { Injectable } from "@nestjs/common";
import type {
  PriceHistoryPoint,
  Venue,
  VenueMarket,
} from "@vibeahack/shared";
import { VENUE_FEES } from "../../config/venue-fees.js";
import {
  emptyQuoteResult,
  filterPriceHistoryRange,
  walkLevels,
} from "../common/fixture-helpers.js";
import type {
  VenueAdapter,
  VenueOrderBookSnapshot,
  VenuePriceHistoryRange,
  VenueQuoteRequest,
  VenueQuoteResult,
} from "../venue-adapter.interface.js";
import { POLYMARKET_MARKETS } from "./fixtures/markets.js";
import { POLYMARKET_ORDER_BOOKS } from "./fixtures/order-books.js";
import { POLYMARKET_PRICE_HISTORY } from "./fixtures/price-history.js";

@Injectable()
export class PolymarketAdapter implements VenueAdapter {
  readonly venue: Venue = "polymarket";

  async listMarkets(): Promise<VenueMarket[]> {
    return [...POLYMARKET_MARKETS];
  }

  async getMarket(sourceMarketId: string): Promise<VenueMarket | null> {
    return (
      POLYMARKET_MARKETS.find((m) => m.sourceMarketId === sourceMarketId) ?? null
    );
  }

  async getOrderBook(
    sourceMarketId: string,
  ): Promise<VenueOrderBookSnapshot | null> {
    return (
      POLYMARKET_ORDER_BOOKS.find((b) => b.sourceMarketId === sourceMarketId) ??
      null
    );
  }

  async getPriceHistory(
    sourceMarketId: string,
    sourceOutcomeId: string,
    range?: VenuePriceHistoryRange,
  ): Promise<PriceHistoryPoint[]> {
    const key = `${sourceMarketId}:${sourceOutcomeId}`;
    const points = POLYMARKET_PRICE_HISTORY[key] ?? [];
    return filterPriceHistoryRange(points, range);
  }

  async quoteOrder(req: VenueQuoteRequest): Promise<VenueQuoteResult> {
    const book = await this.getOrderBook(req.sourceMarketId);
    const outcomeBook = book?.outcomes.find(
      (o) => o.sourceOutcomeId === req.sourceOutcomeId,
    );
    if (!outcomeBook) return emptyQuoteResult(this.venue, req);
    const levels = req.side === "buy" ? outcomeBook.asks : outcomeBook.bids;
    return walkLevels(this.venue, req, levels, VENUE_FEES[this.venue].takerBps);
  }
}

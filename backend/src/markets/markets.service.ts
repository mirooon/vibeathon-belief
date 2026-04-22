import {
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  ErrorCode,
  type AggregatedBestPrice,
  type MarketDetail,
  type MarketListItem,
  type MarketListOutcome,
  type MarketListResponse,
  type MarketSortField,
  type MarketSortOrder,
  type MarketStatus,
  type OrderBookLevel,
  type OutcomePriceHistory,
  type PriceHistoryPoint,
  type QuoteRequest,
  type QuoteResponse,
  type Venue,
  type VenueBreakdown,
  type VenueBreakdownOutcome,
} from "@vibeahack/shared";
import type { Model } from "mongoose";
import { buildQuote } from "../aggregation/quote-engine.js";
import { buildUnifiedPriceSeries } from "../aggregation/price-series.js";
import { ApiException } from "../common/api-exception.js";
import { VENUE_FEES } from "../config/venue-fees.js";
import {
  LOGICAL_MARKET_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
  PRICE_HISTORY_MODEL,
  VENUE_MARKET_MODEL,
} from "../mongo/schemas.js";

/**
 * Shapes of the leaned Mongoose docs we read. These are narrow typings over
 * what the schemas store; trust-the-schema is a Phase-1 simplification.
 */
interface LogicalMarketDoc {
  _id: string;
  title: string;
  category: string;
  endDate: Date;
  status: MarketStatus;
  quoteCurrency: "USD";
  outcomes: Array<{ id: string; label: string }>;
  venueMarkets: Array<{
    venue: Venue;
    sourceMarketId: string;
    outcomeMap: Record<string, string> | Map<string, string>;
  }>;
  eventId?: string;
  eventTitle?: string;
  groupItemTitle?: string;
}

interface SnapshotOutcomeDoc {
  sourceOutcomeId: string;
  canonicalOutcomeId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

interface SnapshotDoc {
  venue: Venue;
  sourceMarketId: string;
  logicalMarketId: string;
  timestamp: Date;
  outcomes: SnapshotOutcomeDoc[];
}

interface PriceHistoryDoc {
  venue: Venue;
  sourceMarketId: string;
  logicalMarketId: string;
  sourceOutcomeId: string;
  canonicalOutcomeId: string;
  points: Array<{ timestamp: Date; price: number }>;
}

interface VenueMarketLinkDoc {
  venue: Venue;
  sourceMarketId: string;
  logicalMarketId: string;
  tradingUrl?: string;
}

@Injectable()
export class MarketsService {
  private readonly logger = new Logger(MarketsService.name);

  constructor(
    @InjectModel(LOGICAL_MARKET_MODEL)
    private readonly logicalMarketModel: Model<LogicalMarketDoc>,
    @InjectModel(VENUE_MARKET_MODEL)
    private readonly venueMarketModel: Model<VenueMarketLinkDoc>,
    @InjectModel(ORDERBOOK_SNAPSHOT_MODEL)
    private readonly snapshotModel: Model<SnapshotDoc>,
    @InjectModel(PRICE_HISTORY_MODEL)
    private readonly priceHistoryModel: Model<PriceHistoryDoc>,
  ) {}

  async list(
    filter: {
      status?: MarketStatus;
      venues?: Venue[];
      sortBy?: MarketSortField;
      sortOrder?: MarketSortOrder;
    } = {},
  ): Promise<MarketListResponse> {
    const query: Record<string, unknown> = {};
    if (filter.status) query.status = filter.status;

    const markets = (await this.logicalMarketModel
      .find(query)
      .lean<LogicalMarketDoc[]>()
      .exec()) ?? [];

    const items: MarketListItem[] = [];
    for (const market of markets) {
      const allSnaps = await this.snapshotModel
        .find({ logicalMarketId: market._id })
        .sort({ timestamp: -1 })
        .lean<SnapshotDoc[]>()
        .exec();
      const seenSnaps = new Set<string>();
      const snapshots = allSnaps.filter((s) => {
        const key = `${s.venue}:${s.sourceMarketId}`;
        if (seenSnaps.has(key)) return false;
        seenSnaps.add(key);
        return true;
      });

      const bestByOutcome = computeBestPrices(snapshots);
      const venues = Array.from(
        new Set(market.venueMarkets.map((v) => v.venue)),
      );

      const outcomes: MarketListOutcome[] = market.outcomes.map((o) => ({
        outcomeId: o.id,
        outcomeLabel: o.label,
        bestBid: bestByOutcome.get(o.id)?.bestBid ?? null,
        bestAsk: bestByOutcome.get(o.id)?.bestAsk ?? null,
      }));

      const tvl = computeTvl(snapshots);
      const volume24h = computeVolume24hStub(market._id, tvl);

      items.push({
        id: market._id,
        title: market.title,
        category: market.category,
        endDate: market.endDate.toISOString(),
        status: market.status,
        quoteCurrency: market.quoteCurrency,
        venues,
        outcomes,
        tvl,
        volume24h,
        ...(market.eventId ? { eventId: market.eventId } : {}),
        ...(market.eventTitle ? { eventTitle: market.eventTitle } : {}),
        ...(market.groupItemTitle ? { groupItemTitle: market.groupItemTitle } : {}),
      });
    }

    // Venue filter: keep markets that list at least one of the requested venues.
    const venueFilter = filter.venues && filter.venues.length > 0
      ? new Set(filter.venues)
      : null;
    const filtered = venueFilter
      ? items.filter((m) => m.venues.some((v) => venueFilter.has(v)))
      : items;

    const sortBy: MarketSortField = filter.sortBy ?? "endDate";
    const sortOrder: MarketSortOrder = filter.sortOrder
      ?? (sortBy === "endDate" ? "asc" : "desc");
    const dir = sortOrder === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = sortBy === "endDate" ? Date.parse(a.endDate) : a[sortBy];
      const bv = sortBy === "endDate" ? Date.parse(b.endDate) : b[sortBy];
      return (av - bv) * dir;
    });

    return { items: filtered, cursor: null };
  }

  async get(
    id: string,
    range?: { from?: string; to?: string },
  ): Promise<MarketDetail> {
    const market = await this.logicalMarketModel
      .findById(id)
      .lean<LogicalMarketDoc | null>()
      .exec();
    if (!market) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.MARKET_NOT_FOUND,
        `No logical market with id '${id}'`,
        { logicalId: id },
      );
    }

    const allSnapshots = await this.snapshotModel
      .find({ logicalMarketId: id })
      .sort({ timestamp: -1 })
      .lean<SnapshotDoc[]>()
      .exec();
    // Keep only the latest snapshot per venue+sourceMarketId
    const seen = new Set<string>();
    const snapshots = allSnapshots.filter((s) => {
      const key = `${s.venue}:${s.sourceMarketId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const histories = await this.priceHistoryModel
      .find({ logicalMarketId: id })
      .lean<PriceHistoryDoc[]>()
      .exec();

    const aggregatedBestPrices: AggregatedBestPrice[] = market.outcomes.map(
      (o) => {
        const best = computeBestPrices(snapshots).get(o.id);
        return {
          outcomeId: o.id,
          bestBid: best?.bestBid ?? null,
          bestAsk: best?.bestAsk ?? null,
        };
      },
    );

    const linkRows =
      (await this.venueMarketModel
        .find({ logicalMarketId: id })
        .lean<VenueMarketLinkDoc[]>()
        .exec()) ?? [];
    const tradingUrlByKey = new Map<string, string | null>();
    for (const row of linkRows) {
      const key = `${row.venue}:${row.sourceMarketId}`;
      const u = row.tradingUrl;
      tradingUrlByKey.set(
        key,
        typeof u === "string" && u.length > 0 ? u : null,
      );
    }

    const venueBreakdown: VenueBreakdown[] = snapshots.map((snap) => {
      const outcomes: VenueBreakdownOutcome[] = snap.outcomes.map((o) => ({
        outcomeId: o.canonicalOutcomeId,
        bestBid: o.bids[0]?.price ?? null,
        bestAsk: o.asks[0]?.price ?? null,
        bidDepth: o.bids.reduce((s, l) => s + l.size, 0),
        askDepth: o.asks.reduce((s, l) => s + l.size, 0),
      }));
      const tKey = `${snap.venue}:${snap.sourceMarketId}`;
      return {
        venue: snap.venue,
        sourceMarketId: snap.sourceMarketId,
        outcomes,
        tradingUrl: tradingUrlByKey.get(tKey) ?? null,
      };
    });

    const priceHistory: OutcomePriceHistory[] = market.outcomes.map((o) => {
      const matching = histories.filter((h) => h.canonicalOutcomeId === o.id);
      const perVenueRaw = matching.map((h) => ({
        venue: h.venue,
        points: filterPointsByRange(h.points, range),
      }));
      const unified = buildUnifiedPriceSeries(perVenueRaw);
      return {
        outcomeId: o.id,
        unified,
        perVenue: perVenueRaw,
      };
    });

    return {
      id: market._id,
      title: market.title,
      category: market.category,
      endDate: market.endDate.toISOString(),
      status: market.status,
      quoteCurrency: market.quoteCurrency,
      outcomes: market.outcomes.map((o) => ({ id: o.id, label: o.label })),
      aggregatedBestPrices,
      venueBreakdown,
      priceHistory,
    };
  }

  async quote(id: string, req: QuoteRequest): Promise<QuoteResponse> {
    const market = await this.logicalMarketModel
      .findById(id)
      .lean<LogicalMarketDoc | null>()
      .exec();
    if (!market) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.MARKET_NOT_FOUND,
        `No logical market with id '${id}'`,
        { logicalId: id },
      );
    }
    if (market.status !== "open") {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "MARKET_NOT_OPEN",
        `Market '${id}' is ${market.status}, not open for quotes`,
        { logicalId: id, status: market.status },
      );
    }

    const outcome = market.outcomes.find((o) => o.id === req.outcomeId);
    if (!outcome) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ErrorCode.OUTCOME_NOT_FOUND,
        `No outcome '${req.outcomeId}' on market '${id}'`,
        { logicalId: id, outcomeId: req.outcomeId },
      );
    }

    const venueOutcomes: { venue: Venue; sourceMarketId: string; sourceOutcomeId: string }[] =
      market.venueMarkets.flatMap((vm) => {
        const map: Record<string, string> =
          vm.outcomeMap instanceof Map
            ? Object.fromEntries(vm.outcomeMap as Map<string, string>)
            : (vm.outcomeMap as Record<string, string>);
        return Object.entries(map)
          .filter(([, canonical]) => canonical === req.outcomeId)
          .map(([sourceOutcomeId]) => ({
            venue: vm.venue,
            sourceMarketId: vm.sourceMarketId,
            sourceOutcomeId,
          }));
      });

    // Collect levels per venue, tolerating missing snapshots (§8d).
    const perVenueByVenue = new Map<Venue, OrderBookLevel[]>();
    for (const ref of venueOutcomes) {
      try {
        const snap = await this.snapshotModel
          .findOne({
            venue: ref.venue,
            sourceMarketId: ref.sourceMarketId,
          })
          .sort({ timestamp: -1 })
          .lean<SnapshotDoc | null>()
          .exec();
        const outcomeBook = snap?.outcomes.find(
          (o) => o.sourceOutcomeId === ref.sourceOutcomeId,
        );
        const levels: OrderBookLevel[] = outcomeBook
          ? req.side === "buy"
            ? outcomeBook.asks
            : outcomeBook.bids
          : [];
        const existing = perVenueByVenue.get(ref.venue) ?? [];
        existing.push(...levels);
        perVenueByVenue.set(ref.venue, existing);
      } catch (err) {
        this.logger.warn(
          `snapshot read failed for ${ref.venue}/${ref.sourceMarketId}: ${String(err)}`,
        );
        if (!perVenueByVenue.has(ref.venue)) {
          perVenueByVenue.set(ref.venue, []);
        }
      }
    }

    const perVenueLevels = [...perVenueByVenue.entries()].map(
      ([venue, levels]) => ({ venue, levels }),
    );

    return buildQuote({
      logicalMarketId: id,
      request: req,
      perVenueLevels,
      feeConfig: VENUE_FEES,
    });
  }
}

function computeBestPrices(
  snapshots: SnapshotDoc[],
): Map<string, { bestBid: number | null; bestAsk: number | null }> {
  const byOutcome = new Map<
    string,
    { bestBid: number | null; bestAsk: number | null }
  >();
  for (const snap of snapshots) {
    for (const o of snap.outcomes) {
      const existing = byOutcome.get(o.canonicalOutcomeId) ?? {
        bestBid: null,
        bestAsk: null,
      };
      const topBid = o.bids[0]?.price;
      const topAsk = o.asks[0]?.price;
      if (typeof topBid === "number") {
        existing.bestBid =
          existing.bestBid === null ? topBid : Math.max(existing.bestBid, topBid);
      }
      if (typeof topAsk === "number") {
        existing.bestAsk =
          existing.bestAsk === null ? topAsk : Math.min(existing.bestAsk, topAsk);
      }
      byOutcome.set(o.canonicalOutcomeId, existing);
    }
  }
  return byOutcome;
}

function computeTvl(snapshots: SnapshotDoc[]): number {
  let total = 0;
  for (const snap of snapshots) {
    for (const o of snap.outcomes) {
      for (const lvl of o.bids) total += lvl.price * lvl.size;
      for (const lvl of o.asks) total += lvl.price * lvl.size;
    }
  }
  return Math.round(total * 100) / 100;
}

// Stub until a trade stream is ingested: deterministic so list ordering is stable.
function computeVolume24hStub(marketId: string, tvl: number): number {
  let h = 2166136261;
  for (let i = 0; i < marketId.length; i++) {
    h = Math.imul(h ^ marketId.charCodeAt(i), 16777619);
  }
  const bucket = ((h >>> 0) % 1000) / 1000;
  const multiplier = 0.4 + bucket * 2.6;
  const base = tvl > 0 ? tvl : 5_000 + bucket * 50_000;
  return Math.round(base * multiplier * 100) / 100;
}

function filterPointsByRange(
  points: Array<{ timestamp: Date; price: number }>,
  range?: { from?: string; to?: string },
): PriceHistoryPoint[] {
  const fromMs = range?.from ? Date.parse(range.from) : Number.NEGATIVE_INFINITY;
  const toMs = range?.to ? Date.parse(range.to) : Number.POSITIVE_INFINITY;
  return points
    .filter((p) => {
      const t = p.timestamp.getTime();
      return t >= fromMs && t <= toMs;
    })
    .map((p) => ({
      timestamp: p.timestamp.toISOString(),
      price: p.price,
    }));
}

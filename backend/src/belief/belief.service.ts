import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type {
  BeliefMatch,
  BeliefRouteMatch,
  BeliefRouteRequest,
  BeliefRouteResponse,
  BeliefSearchRequest,
  BeliefSearchResponse,
  BudgetRoute,
  MarketListItem,
  MarketStatus,
  OrderBookLevel,
  Venue,
} from "@vibeahack/shared";
import type { Model } from "mongoose";
import { buildBudgetQuote } from "../aggregation/quote-engine.js";
import { VENUE_FEES } from "../config/venue-fees.js";
import {
  LOGICAL_MARKET_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
} from "../mongo/schemas.js";
import {
  buildSearchableMarketText,
  buildSearchableOutcomeText,
} from "./belief-text.js";
import { EmbeddingService } from "./embedding.service.js";

/** Parallel `encode` calls to avoid stalling the event loop; tune if needed. */
const EMBED_CONCURRENCY = 6;

interface LogicalMarketDoc {
  _id: string;
  title: string;
  category: string;
  endDate: Date;
  status: MarketStatus;
  quoteCurrency: "USD";
  eventTitle?: string;
  groupItemTitle?: string;
  outcomes: Array<{ id: string; label: string }>;
  venueMarkets: Array<{ venue: string; sourceMarketId: string }>;
}

interface SnapshotDoc {
  venue: string;
  sourceMarketId: string;
  sourceOutcomeId?: string;
  logicalMarketId: string;
  outcomes: Array<{
    canonicalOutcomeId: string;
    sourceOutcomeId?: string;
    bids: Array<{ price: number; size: number }>;
    asks: Array<{ price: number; size: number }>;
  }>;
}

function outcomeKey(marketId: string, outcomeId: string): string {
  return `${marketId}:${outcomeId}`;
}

/**
 * Detects explicit negation in a belief so we can route it to the "No" side
 * of a binary market. Catches common forms: "not", "won't", "will not",
 * "never", contracted forms with curly apostrophes. Not exhaustive — indirect
 * negation like "I doubt that X" is not detected.
 */
export function isNegativeBelief(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'");
  return /\b(not|never|won't|wont|can't|cant|cannot|doesn't|doesnt|don't|dont|isn't|isnt|ain't|aint|shouldn't|shouldnt|wouldn't|wouldnt)\b/.test(
    normalized,
  );
}

@Injectable()
export class BeliefService implements OnModuleInit {
  private readonly logger = new Logger(BeliefService.name);
  private readonly marketVectors = new Map<string, number[]>();
  private readonly outcomeVectors = new Map<string, number[]>();
  private vectorsReady: Promise<void> | null = null;

  constructor(
    private readonly embedding: EmbeddingService,
    @InjectModel(LOGICAL_MARKET_MODEL)
    private readonly logicalMarketModel: Model<LogicalMarketDoc>,
    @InjectModel(ORDERBOOK_SNAPSHOT_MODEL)
    private readonly snapshotModel: Model<SnapshotDoc>,
  ) {}

  onModuleInit(): void {
    this.vectorsReady = this.buildVectors();
  }

  private async runWithConcurrencyLimit(
    tasks: Array<() => Promise<void>>,
    limit: number,
  ): Promise<void> {
    if (tasks.length === 0) return;
    let i = 0;
    const worker = async () => {
      for (;;) {
        const idx = i < tasks.length ? i++ : -1;
        if (idx < 0) return;
        await tasks[idx]!();
      }
    };
    const n = Math.min(limit, tasks.length);
    await Promise.all(Array.from({ length: n }, () => worker()));
  }

  private async ensureMarketVector(market: LogicalMarketDoc): Promise<number[]> {
    let v = this.marketVectors.get(market._id);
    if (!v) {
      v = await this.embedding.encode(
        buildSearchableMarketText(market),
      );
      this.marketVectors.set(market._id, v);
    }
    return v;
  }

  private async ensureOutcomeVector(
    market: LogicalMarketDoc,
    outcome: { id: string; label: string },
  ): Promise<number[]> {
    const key = outcomeKey(market._id, outcome.id);
    let v = this.outcomeVectors.get(key);
    if (!v) {
      v = await this.embedding.encode(
        buildSearchableOutcomeText(market, outcome),
      );
      this.outcomeVectors.set(key, v);
    }
    return v;
  }

  private async buildVectors(): Promise<void> {
    this.logger.log("Pre-computing market + outcome embeddings from open markets…");

    const openMarkets = await this.logicalMarketModel
      .find({ status: "open" })
      .lean<LogicalMarketDoc[]>()
      .exec();

    const tasks: Array<() => Promise<void>> = [];
    for (const m of openMarkets) {
      tasks.push(() => this.ensureMarketVector(m).then(() => undefined));
      for (const o of m.outcomes) {
        tasks.push(() =>
          this.ensureOutcomeVector(m, o).then(() => undefined),
        );
      }
    }

    await this.runWithConcurrencyLimit(tasks, EMBED_CONCURRENCY);
    this.logger.log(
      `Embeddings ready (${this.marketVectors.size} markets, ${this.outcomeVectors.size} outcomes) from ${openMarkets.length} open logical markets.`,
    );
  }

  async search(req: BeliefSearchRequest): Promise<BeliefSearchResponse> {
    await this.vectorsReady;

    const limit = req.limit ?? 5;
    const minScore = req.minScore ?? 0;
    const queryVec = await this.embedding.encode(req.belief);

    const markets = await this.logicalMarketModel
      .find({ status: "open" })
      .lean<LogicalMarketDoc[]>()
      .exec();

    const scored: Array<{ marketId: string; score: number }> = [];
    for (const market of markets) {
      const vec = await this.ensureMarketVector(market);
      const score = this.embedding.cosineSimilarity(queryVec, vec);
      if (score >= minScore) {
        scored.push({ marketId: market._id, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const matches: BeliefMatch[] = [];
    for (const { marketId, score } of scored.slice(0, limit)) {
      const market = markets.find((m) => m._id === marketId);
      if (!market) continue;
      const item = await this.buildMarketListItem(market);
      matches.push({ market: item, score: Math.round(score * 1000) / 1000 });
    }

    return { belief: req.belief, matches };
  }

  async route(req: BeliefRouteRequest): Promise<BeliefRouteResponse> {
    await this.vectorsReady;

    const limit = req.limit ?? 3;
    const minScore = req.minScore ?? 0.3;
    const queryVec = await this.embedding.encode(req.belief);
    const beliefIsNegative =
      req.side === "no" ||
      (req.side === undefined && isNegativeBelief(req.belief));

    const markets = await this.logicalMarketModel
      .find({ status: "open" })
      .lean<LogicalMarketDoc[]>()
      .exec();

    // Score at the MARKET level (not per-outcome). MiniLM poorly discriminates
    // the single-token difference between "Outcome: Yes" and "Outcome: No"; the
    // polarity of the belief is instead resolved by keyword heuristic below.
    const scored: Array<{ market: LogicalMarketDoc; score: number }> = [];
    for (const market of markets) {
      const vec = await this.ensureMarketVector(market);
      const score = this.embedding.cosineSimilarity(queryVec, vec);
      if (score >= minScore) scored.push({ market, score });
    }
    scored.sort((a, b) => b.score - a.score);

    // Walk ranked markets, pick the outcome by polarity, drop markets whose
    // orderbook can't absorb any of the budget, and stop at `limit` filled
    // matches. Bounded by MAX_ROUTE_CANDIDATES to cap DB load.
    const MAX_ROUTE_CANDIDATES = Math.max(limit * 8, 24);
    const matches: BeliefRouteMatch[] = [];
    let evaluated = 0;
    for (const { market, score } of scored) {
      if (matches.length >= limit) break;
      if (evaluated >= MAX_ROUTE_CANDIDATES) break;
      evaluated++;

      const outcome = await this.pickOutcomeForBelief(
        market,
        queryVec,
        beliefIsNegative,
      );
      if (!outcome) continue;

      const route = await this.buildBudgetRoute(
        market._id,
        outcome.id,
        req.budgetUsd,
      );
      if (route.filledSizeShares <= 0) continue;

      const listItem = await this.buildMarketListItem(market);
      matches.push({
        score: Math.round(score * 1000) / 1000,
        market: listItem,
        outcome: {
          outcomeId: outcome.id,
          outcomeLabel: outcome.label,
        },
        route,
      });
    }

    return { belief: req.belief, budgetUsd: req.budgetUsd, matches };
  }

  /**
   * Binary Yes/No markets: pick by explicit negation in the belief text
   * (heuristic — much more reliable than MiniLM's weak polarity signal).
   * Non-binary markets: fall back to per-outcome embedding similarity.
   */
  private async pickOutcomeForBelief(
    market: LogicalMarketDoc,
    queryVec: number[],
    beliefIsNegative: boolean,
  ): Promise<{ id: string; label: string } | null> {
    const yes = market.outcomes.find((o) => /^y(es)?$/i.test(o.label));
    const no = market.outcomes.find((o) => /^no?$/i.test(o.label));
    if (yes && no) {
      return beliefIsNegative ? no : yes;
    }
    let best: { outcome: { id: string; label: string }; score: number } | null =
      null;
    for (const outcome of market.outcomes) {
      const vec = await this.ensureOutcomeVector(market, outcome);
      const score = this.embedding.cosineSimilarity(queryVec, vec);
      if (!best || score > best.score) best = { outcome, score };
    }
    return best?.outcome ?? null;
  }

  private async buildBudgetRoute(
    logicalMarketId: string,
    outcomeId: string,
    budgetUsd: number,
  ): Promise<BudgetRoute> {
    // Read the latest snapshot per venue keyed by logicalMarketId.
    // Works for both seeded (multi-venue) and worker-ingested (venue-scoped)
    // markets — the matcher is not consulted because ingested markets have no
    // static matcher entry.
    const snaps = await this.snapshotModel
      .find({ logicalMarketId })
      .sort({ timestamp: -1 })
      .lean<SnapshotDoc[]>()
      .exec();

    const latestByVenue = new Map<Venue, SnapshotDoc>();
    for (const snap of snaps) {
      const v = snap.venue as Venue;
      if (!latestByVenue.has(v)) latestByVenue.set(v, snap);
    }

    const perVenueByVenue = new Map<Venue, OrderBookLevel[]>();
    for (const [venue, snap] of latestByVenue) {
      const book = snap.outcomes.find(
        (o) => o.canonicalOutcomeId === outcomeId,
      );
      const asks: OrderBookLevel[] = book?.asks ?? [];
      if (asks.length > 0) perVenueByVenue.set(venue, asks);
    }

    return buildBudgetQuote({
      perVenueLevels: [...perVenueByVenue.entries()].map(
        ([venue, levels]) => ({ venue, levels }),
      ),
      budgetUsd,
      feeConfig: VENUE_FEES,
    });
  }

  private async buildMarketListItem(
    market: LogicalMarketDoc,
  ): Promise<MarketListItem> {
    const snapshots = await this.snapshotModel
      .find({ logicalMarketId: market._id })
      .lean<SnapshotDoc[]>()
      .exec();

    const bestByOutcome = new Map<
      string,
      { bestBid: number | null; bestAsk: number | null }
    >();
    for (const snap of snapshots) {
      for (const o of snap.outcomes) {
        const existing = bestByOutcome.get(o.canonicalOutcomeId) ?? {
          bestBid: null,
          bestAsk: null,
        };
        const topBid = o.bids[0]?.price;
        const topAsk = o.asks[0]?.price;
        if (typeof topBid === "number") {
          existing.bestBid =
            existing.bestBid === null
              ? topBid
              : Math.max(existing.bestBid, topBid);
        }
        if (typeof topAsk === "number") {
          existing.bestAsk =
            existing.bestAsk === null
              ? topAsk
              : Math.min(existing.bestAsk, topAsk);
        }
        bestByOutcome.set(o.canonicalOutcomeId, existing);
      }
    }

    const venues = Array.from(
      new Set(
        market.venueMarkets.map(
          (v) => v.venue as "polymarket" | "kalshi" | "myriad",
        ),
      ),
    );

    let tvl = 0;
    for (const snap of snapshots) {
      for (const o of snap.outcomes) {
        for (const lvl of o.bids) tvl += lvl.price * lvl.size;
        for (const lvl of o.asks) tvl += lvl.price * lvl.size;
      }
    }
    tvl = Math.round(tvl * 100) / 100;

    let h = 2166136261;
    for (let i = 0; i < market._id.length; i++) {
      h = Math.imul(h ^ market._id.charCodeAt(i), 16777619);
    }
    const bucket = ((h >>> 0) % 1000) / 1000;
    const multiplier = 0.4 + bucket * 2.6;
    const base = tvl > 0 ? tvl : 5_000 + bucket * 50_000;
    const volume24h = Math.round(base * multiplier * 100) / 100;

    return {
      id: market._id,
      title: market.title,
      category: market.category,
      endDate: market.endDate.toISOString(),
      status: market.status,
      quoteCurrency: market.quoteCurrency,
      venues,
      outcomes: market.outcomes.map((o) => ({
        outcomeId: o.id,
        outcomeLabel: o.label,
        bestBid: bestByOutcome.get(o.id)?.bestBid ?? null,
        bestAsk: bestByOutcome.get(o.id)?.bestAsk ?? null,
      })),
      tvl,
      volume24h,
    };
  }
}


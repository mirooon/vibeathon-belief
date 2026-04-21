import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
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
  MARKET_MATCHER,
  type MarketMatcher,
} from "../matching/market-matcher.interface.js";
import {
  LOGICAL_MARKET_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
} from "../mongo/schemas.js";
import { EmbeddingService } from "./embedding.service.js";
import {
  MARKET_CONCEPT_TEXTS,
  OUTCOME_CONCEPT_TEXTS,
} from "./fixtures/market-concepts.js";

interface LogicalMarketDoc {
  _id: string;
  title: string;
  category: string;
  endDate: Date;
  status: MarketStatus;
  quoteCurrency: "USD";
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
    @Inject(MARKET_MATCHER)
    private readonly matcher: MarketMatcher,
  ) {}

  onModuleInit(): void {
    // Build market + outcome vectors after the embedding model finishes loading.
    this.vectorsReady = this.buildVectors();
  }

  private async buildVectors(): Promise<void> {
    this.logger.log("Pre-computing market + outcome embeddings…");

    const marketTasks = Object.entries(MARKET_CONCEPT_TEXTS).map(
      async ([marketId, text]) => {
        const vec = await this.embedding.encode(text);
        this.marketVectors.set(marketId, vec);
      },
    );

    const logicalMarkets = await this.matcher.getLogicalMarkets();
    const outcomeTasks: Array<Promise<void>> = [];
    for (const market of logicalMarkets) {
      const marketConcept = MARKET_CONCEPT_TEXTS[market.id];
      if (!marketConcept) continue;
      const overrides = OUTCOME_CONCEPT_TEXTS[market.id] ?? {};
      for (const outcome of market.outcomes) {
        const text =
          overrides[outcome.id] ?? `${marketConcept} ${outcome.label}`;
        outcomeTasks.push(
          this.embedding.encode(text).then((vec) => {
            this.outcomeVectors.set(outcomeKey(market.id, outcome.id), vec);
          }),
        );
      }
    }

    await Promise.all([...marketTasks, ...outcomeTasks]);
    this.logger.log(
      `Embeddings ready (${this.marketVectors.size} markets, ${this.outcomeVectors.size} outcomes).`,
    );
  }

  async search(req: BeliefSearchRequest): Promise<BeliefSearchResponse> {
    // Ensure market vectors (and the model) are ready before searching.
    await this.vectorsReady;

    const limit = req.limit ?? 5;
    const queryVec = await this.embedding.encode(req.belief);

    const markets = await this.logicalMarketModel
      .find({ status: "open" })
      .lean<LogicalMarketDoc[]>()
      .exec();

    const scored: Array<{ marketId: string; score: number }> = [];
    for (const market of markets) {
      const vec = this.marketVectors.get(market._id);
      if (!vec) continue;
      const score = this.embedding.cosineSimilarity(queryVec, vec);
      if (score > 0) scored.push({ marketId: market._id, score });
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

    const markets = await this.logicalMarketModel
      .find({ status: "open" })
      .lean<LogicalMarketDoc[]>()
      .exec();

    // Score every (market, outcome) and keep the best-scoring outcome per market.
    const bestOutcomePerMarket = new Map<
      string,
      { outcomeId: string; outcomeLabel: string; score: number }
    >();
    for (const market of markets) {
      for (const outcome of market.outcomes) {
        const vec = this.outcomeVectors.get(outcomeKey(market._id, outcome.id));
        if (!vec) continue;
        const score = this.embedding.cosineSimilarity(queryVec, vec);
        if (score < minScore) continue;
        const current = bestOutcomePerMarket.get(market._id);
        if (!current || score > current.score) {
          bestOutcomePerMarket.set(market._id, {
            outcomeId: outcome.id,
            outcomeLabel: outcome.label,
            score,
          });
        }
      }
    }

    const ranked = [...bestOutcomePerMarket.entries()]
      .map(([marketId, best]) => ({ marketId, ...best }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const matches: BeliefRouteMatch[] = [];
    for (const pick of ranked) {
      const market = markets.find((m) => m._id === pick.marketId);
      if (!market) continue;
      const listItem = await this.buildMarketListItem(market);
      const route = await this.buildBudgetRoute(
        pick.marketId,
        pick.outcomeId,
        req.budgetUsd,
      );
      matches.push({
        score: Math.round(pick.score * 1000) / 1000,
        market: listItem,
        outcome: {
          outcomeId: pick.outcomeId,
          outcomeLabel: pick.outcomeLabel,
        },
        route,
      });
    }

    return { belief: req.belief, budgetUsd: req.budgetUsd, matches };
  }

  private async buildBudgetRoute(
    logicalMarketId: string,
    outcomeId: string,
    budgetUsd: number,
  ): Promise<BudgetRoute> {
    const venueOutcomes = await this.matcher.findVenueOutcomes(
      logicalMarketId,
      outcomeId,
    );

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
          (o) =>
            o.sourceOutcomeId === ref.sourceOutcomeId ||
            o.canonicalOutcomeId === outcomeId,
        );
        const asks: OrderBookLevel[] = outcomeBook?.asks ?? [];
        const existing = perVenueByVenue.get(ref.venue) ?? [];
        existing.push(...asks);
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

    return buildBudgetQuote({
      perVenueLevels,
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

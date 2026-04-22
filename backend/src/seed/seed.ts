/* eslint-disable no-console */
import type { MarketStatus, Venue } from "@vibeahack/shared";
import mongoose from "mongoose";
import { StaticSeededMatcher } from "../matching/static-seeded-matcher.js";
import { ensureModel } from "../mongo/model-registry.js";
import {
  LOGICAL_EVENT_MODEL,
  LOGICAL_MARKET_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
  PRICE_HISTORY_MODEL,
  VENUE_MARKET_MODEL,
  logicalEventSchema,
  logicalMarketSchema,
  orderBookSnapshotSchema,
  priceHistorySchema,
  venueMarketSchema,
} from "../mongo/schemas.js";
import { KalshiAdapter } from "../venues/kalshi/kalshi.adapter.js";
import { MyriadAdapter } from "../venues/myriad/myriad.adapter.js";
import { PolymarketAdapter } from "../venues/polymarket/polymarket.adapter.js";
import type { VenueAdapter } from "../venues/venue-adapter.interface.js";

const SAFE_MONGO_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "mongodb",
]);

export function assertSafeMongoUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url.replace(/^mongodb(\+srv)?:\/\//, "http://"));
  } catch {
    throw new Error(`MONGO_URL is not a valid URI: ${url}`);
  }
  if (!SAFE_MONGO_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `Refusing to seed: MONGO_URL host '${parsed.hostname}' is not in allowlist ${[
        ...SAFE_MONGO_HOSTS,
      ].join(", ")}. Seed is destructive — point at a local Mongo only.`,
    );
  }
}

export interface SeedOptions {
  mongoUrl: string;
  /** When true the function manages the connection; when false the caller owns it. */
  manageConnection?: boolean;
  silent?: boolean;
}

export interface SeedReport {
  logicalMarkets: number;
  venueMarkets: number;
  snapshots: number;
  priceHistoryDocs: number;
  logicalEvents: number;
}

interface EventRollup {
  id: string;
  title: string;
  category: string;
  endDate: Date;
  status: MarketStatus;
  mutuallyExclusive: boolean;
  childMarketIds: string[];
  venues: Set<Venue>;
  liquidity: number;
  volume24h: number;
}

const STATUS_RANK: Record<MarketStatus, number> = {
  open: 0,
  closed: 1,
  resolved: 2,
};

function rollupStatus(a: MarketStatus, b: MarketStatus): MarketStatus {
  return STATUS_RANK[a] <= STATUS_RANK[b] ? a : b;
}

// Deterministic stub so event volume24h is stable across seeds but non-zero.
function volume24hStub(marketId: string, tvl: number): number {
  let h = 2166136261;
  for (let i = 0; i < marketId.length; i++) {
    h = Math.imul(h ^ marketId.charCodeAt(i), 16777619);
  }
  const bucket = ((h >>> 0) % 1000) / 1000;
  const multiplier = 0.4 + bucket * 2.6;
  const base = tvl > 0 ? tvl : 5_000 + bucket * 50_000;
  return Math.round(base * multiplier * 100) / 100;
}

export async function seed(options: SeedOptions): Promise<SeedReport> {
  assertSafeMongoUrl(options.mongoUrl);

  const log = options.silent ? () => {} : (msg: string) => console.log(msg);
  const manage = options.manageConnection ?? true;

  if (manage) {
    log(`[seed] connecting to ${options.mongoUrl}`);
    await mongoose.connect(options.mongoUrl);
  }

  const LogicalMarketModel = ensureModel(
    LOGICAL_MARKET_MODEL,
    logicalMarketSchema,
  );
  const VenueMarketModel = ensureModel(
    VENUE_MARKET_MODEL,
    venueMarketSchema,
  );
  const OrderBookSnapshotModel = ensureModel(
    ORDERBOOK_SNAPSHOT_MODEL,
    orderBookSnapshotSchema,
  );
  const PriceHistoryModel = ensureModel(
    PRICE_HISTORY_MODEL,
    priceHistorySchema,
  );
  const LogicalEventModel = ensureModel(
    LOGICAL_EVENT_MODEL,
    logicalEventSchema,
  );

  log("[seed] dropping collections");
  await Promise.all([
    LogicalMarketModel.deleteMany({}).exec(),
    VenueMarketModel.deleteMany({}).exec(),
    OrderBookSnapshotModel.deleteMany({}).exec(),
    PriceHistoryModel.deleteMany({}).exec(),
    LogicalEventModel.deleteMany({}).exec(),
  ]);

  const matcher = new StaticSeededMatcher();
  const adapters: Record<string, VenueAdapter> = {
    polymarket: new PolymarketAdapter(),
    kalshi: new KalshiAdapter(),
    myriad: new MyriadAdapter(),
  };

  const logicalMarkets = await matcher.getLogicalMarkets();

  let venueMarketCount = 0;
  let snapshotCount = 0;
  let priceHistoryCount = 0;
  const eventRollups = new Map<string, EventRollup>();

  for (const logical of logicalMarkets) {
    // Markets without an explicit eventId roll up into a singleton event so
    // every logical market shows up on the events endpoint — matches how
    // Polymarket's homepage treats every market as living under some event.
    const logicalEventId = logical.eventId ?? `evt-${logical.id}`;
    const eventTitle = logical.eventTitle ?? logical.title;
    const logicalEndDate = new Date(logical.endDate);

    await LogicalMarketModel.create({
      _id: logical.id,
      title: logical.title,
      category: logical.category,
      endDate: logicalEndDate,
      status: logical.status,
      quoteCurrency: logical.quoteCurrency,
      outcomes: logical.outcomes,
      venueMarkets: logical.venueMarkets.map((ref) => ({
        venue: ref.venue,
        sourceMarketId: ref.sourceMarketId,
        outcomeMap: ref.outcomeMap,
      })),
      logicalEventId,
      ...(logical.eventId ? { eventId: logical.eventId } : {}),
      ...(logical.eventTitle ? { eventTitle: logical.eventTitle } : {}),
      ...(logical.groupItemTitle ? { groupItemTitle: logical.groupItemTitle } : {}),
    });

    let childLiquidity = 0;

    for (const ref of logical.venueMarkets) {
      const adapter = adapters[ref.venue];
      if (!adapter) {
        throw new Error(`no adapter registered for venue ${ref.venue}`);
      }

      const venueMarket = await adapter.getMarket(ref.sourceMarketId);
      if (!venueMarket) {
        throw new Error(
          `adapter ${ref.venue} does not know market ${ref.sourceMarketId} — fixture/matcher mismatch`,
        );
      }
      await VenueMarketModel.create({
        venue: venueMarket.venue,
        sourceMarketId: venueMarket.sourceMarketId,
        logicalMarketId: logical.id,
        logicalEventId,
        title: venueMarket.title,
        category: venueMarket.category,
        endDate: new Date(venueMarket.endDate),
        status: venueMarket.status,
        quoteCurrency: venueMarket.quoteCurrency,
        outcomes: venueMarket.outcomes,
        ...(logical.groupItemTitle
          ? { groupItemTitle: logical.groupItemTitle }
          : {}),
      });
      venueMarketCount += 1;

      const book = await adapter.getOrderBook(ref.sourceMarketId);
      if (book) {
        const outcomesWithCanonical = book.outcomes
          .map((o) => {
            const canonical = ref.outcomeMap[o.sourceOutcomeId];
            if (!canonical) return null;
            return {
              sourceOutcomeId: o.sourceOutcomeId,
              canonicalOutcomeId: canonical,
              bids: o.bids,
              asks: o.asks,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        if (outcomesWithCanonical.length > 0) {
          await OrderBookSnapshotModel.create({
            venue: book.venue,
            sourceMarketId: book.sourceMarketId,
            logicalMarketId: logical.id,
            timestamp: new Date(book.timestamp),
            outcomes: outcomesWithCanonical,
          });
          snapshotCount += 1;

          for (const o of outcomesWithCanonical) {
            for (const lvl of o.bids) childLiquidity += lvl.price * lvl.size;
            for (const lvl of o.asks) childLiquidity += lvl.price * lvl.size;
          }
        }
      }

      for (const [sourceOutcomeId, canonicalOutcomeId] of Object.entries(
        ref.outcomeMap,
      )) {
        const points = await adapter.getPriceHistory(
          ref.sourceMarketId,
          sourceOutcomeId,
        );
        if (points.length === 0) continue;
        await PriceHistoryModel.create({
          venue: ref.venue,
          sourceMarketId: ref.sourceMarketId,
          logicalMarketId: logical.id,
          sourceOutcomeId,
          canonicalOutcomeId,
          points: points.map((p) => ({
            timestamp: new Date(p.timestamp),
            price: p.price,
          })),
        });
        priceHistoryCount += 1;
      }
    }

    const childLiquidityRounded = Math.round(childLiquidity * 100) / 100;
    const childVolume24h = volume24hStub(logical.id, childLiquidityRounded);
    const rollup = eventRollups.get(logicalEventId);
    if (rollup) {
      rollup.childMarketIds.push(logical.id);
      for (const vm of logical.venueMarkets) rollup.venues.add(vm.venue);
      rollup.liquidity += childLiquidityRounded;
      rollup.volume24h += childVolume24h;
      rollup.status = rollupStatus(rollup.status, logical.status);
      if (logicalEndDate.getTime() > rollup.endDate.getTime()) {
        rollup.endDate = logicalEndDate;
      }
      // ≥2 children rolled up into one explicit eventId = negRisk sibling set.
      rollup.mutuallyExclusive = true;
    } else {
      eventRollups.set(logicalEventId, {
        id: logicalEventId,
        title: eventTitle,
        category: logical.category,
        endDate: logicalEndDate,
        status: logical.status,
        mutuallyExclusive: false,
        childMarketIds: [logical.id],
        venues: new Set<Venue>(logical.venueMarkets.map((vm) => vm.venue)),
        liquidity: childLiquidityRounded,
        volume24h: childVolume24h,
      });
    }
  }

  for (const r of eventRollups.values()) {
    await LogicalEventModel.create({
      _id: r.id,
      title: r.title,
      category: r.category,
      endDate: r.endDate,
      status: r.status,
      mutuallyExclusive: r.mutuallyExclusive,
      childMarketIds: r.childMarketIds,
      venues: [...r.venues],
      liquidity: Math.round(r.liquidity * 100) / 100,
      volume24h: Math.round(r.volume24h * 100) / 100,
      volume: Math.round(r.liquidity * 100) / 100,
      featured: false,
    });
  }

  const report: SeedReport = {
    logicalMarkets: logicalMarkets.length,
    venueMarkets: venueMarketCount,
    snapshots: snapshotCount,
    priceHistoryDocs: priceHistoryCount,
    logicalEvents: eventRollups.size,
  };
  log(
    `[seed] done: ${report.logicalMarkets} logical, ${report.venueMarkets} venue, ${report.snapshots} snapshots, ${report.priceHistoryDocs} price-history docs, ${report.logicalEvents} events`,
  );

  if (manage) {
    await mongoose.disconnect();
  }

  return report;
}

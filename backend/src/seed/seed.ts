/* eslint-disable no-console */
import mongoose from "mongoose";
import { StaticSeededMatcher } from "../matching/static-seeded-matcher.js";
import { ensureModel } from "../mongo/model-registry.js";
import {
  LOGICAL_MARKET_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
  PRICE_HISTORY_MODEL,
  VENUE_MARKET_MODEL,
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

  /**
   * Demo trading links for a few fixture ids so the market page CTA works
   * without the live Polymarket/Kalshi worker. Keys are `${venue}:${sourceMarketId}`.
   */
  const seedVenueTradingUrl: Record<string, string> = {
    "polymarket:poly-fifa-arg": "https://polymarket.com/event/2026-fifa-wc-demo",
    "polymarket:poly-btc-100k-2026": "https://polymarket.com/event/bitcoin-above-100k-dec-2026-483",
    "kalshi:kalshi-fifa-arg": "https://trading.kalshi.com/market/kalshi-fifa-arg",
  };

  log("[seed] dropping collections");
  await Promise.all([
    LogicalMarketModel.deleteMany({}).exec(),
    VenueMarketModel.deleteMany({}).exec(),
    OrderBookSnapshotModel.deleteMany({}).exec(),
    PriceHistoryModel.deleteMany({}).exec(),
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

  for (const logical of logicalMarkets) {
    await LogicalMarketModel.create({
      _id: logical.id,
      title: logical.title,
      category: logical.category,
      endDate: new Date(logical.endDate),
      status: logical.status,
      quoteCurrency: logical.quoteCurrency,
      outcomes: logical.outcomes,
      venueMarkets: logical.venueMarkets.map((ref) => ({
        venue: ref.venue,
        sourceMarketId: ref.sourceMarketId,
        outcomeMap: ref.outcomeMap,
      })),
      ...(logical.eventId ? { eventId: logical.eventId } : {}),
      ...(logical.eventTitle ? { eventTitle: logical.eventTitle } : {}),
      ...(logical.groupItemTitle ? { groupItemTitle: logical.groupItemTitle } : {}),
    });

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
      const tKey = `${ref.venue}:${ref.sourceMarketId}`;
      const tradingUrl = seedVenueTradingUrl[tKey];
      await VenueMarketModel.create({
        venue: venueMarket.venue,
        sourceMarketId: venueMarket.sourceMarketId,
        logicalMarketId: logical.id,
        title: venueMarket.title,
        category: venueMarket.category,
        endDate: new Date(venueMarket.endDate),
        status: venueMarket.status,
        quoteCurrency: venueMarket.quoteCurrency,
        outcomes: venueMarket.outcomes,
        ...(tradingUrl ? { tradingUrl } : {}),
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
  }

  const report: SeedReport = {
    logicalMarkets: logicalMarkets.length,
    venueMarkets: venueMarketCount,
    snapshots: snapshotCount,
    priceHistoryDocs: priceHistoryCount,
  };
  log(
    `[seed] done: ${report.logicalMarkets} logical, ${report.venueMarkets} venue, ${report.snapshots} snapshots, ${report.priceHistoryDocs} price-history docs`,
  );

  if (manage) {
    await mongoose.disconnect();
  }

  return report;
}

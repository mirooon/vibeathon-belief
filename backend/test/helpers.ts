import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import mongoose from "mongoose";
import { AppModule } from "../src/app.module.js";
import { ErrorEnvelopeFilter } from "../src/common/error-envelope.filter.js";
import { seed } from "../src/seed/seed.js";

const API_PREFIX = "api/v1";

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ErrorEnvelopeFilter());
  await app.init();
  return app;
}

async function ensureDefaultConnection(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  const mongoUrl =
    process.env.MONGO_URL ?? "mongodb://localhost:27017/vibeahack";
  await mongoose.connect(mongoUrl);
}

export async function wipeDb(): Promise<void> {
  await ensureDefaultConnection();
  const collections = [
    "logical_markets",
    "venue_markets",
    "venue_orderbook_snapshots",
    "price_history",
  ];
  for (const name of collections) {
    try {
      await mongoose.connection.collection(name).deleteMany({});
    } catch {
      // Collection may not exist yet — ignore.
    }
  }
}

export async function reseed(): Promise<void> {
  await ensureDefaultConnection();
  const mongoUrl =
    process.env.MONGO_URL ?? "mongodb://localhost:27017/vibeahack";
  await seed({ mongoUrl, manageConnection: false, silent: true });
}

export async function deleteSnapshotByVenue(
  venue: string,
  sourceMarketId: string,
): Promise<void> {
  await ensureDefaultConnection();
  await mongoose.connection
    .collection("venue_orderbook_snapshots")
    .deleteMany({ venue, sourceMarketId });
}

export async function disconnectDefault(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

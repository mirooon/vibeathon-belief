import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  LOGICAL_EVENT_MODEL,
  LOGICAL_MARKET_MODEL,
  ORDERBOOK_SNAPSHOT_MODEL,
  PRICE_HISTORY_MODEL,
  VENUE_EVENT_MODEL,
  VENUE_MARKET_MODEL,
  logicalEventSchema,
  logicalMarketSchema,
  orderBookSnapshotSchema,
  priceHistorySchema,
  venueEventSchema,
  venueMarketSchema,
} from "./schemas.js";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URL ?? "mongodb://localhost:27017/vibeahack",
      }),
    }),
    MongooseModule.forFeature([
      { name: LOGICAL_MARKET_MODEL, schema: logicalMarketSchema },
      { name: VENUE_MARKET_MODEL, schema: venueMarketSchema },
      { name: LOGICAL_EVENT_MODEL, schema: logicalEventSchema },
      { name: VENUE_EVENT_MODEL, schema: venueEventSchema },
      { name: ORDERBOOK_SNAPSHOT_MODEL, schema: orderBookSnapshotSchema },
      { name: PRICE_HISTORY_MODEL, schema: priceHistorySchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}

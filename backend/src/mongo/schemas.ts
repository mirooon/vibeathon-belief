import { Schema } from "mongoose";

/**
 * Mongoose schemas for the four Phase-1 collections (§5).
 *
 * Storage shape vs. DTO shape: documents mirror the shared types closely but
 * use `_id` for the canonical id where applicable (LogicalMarket), so reads are
 * primary-key lookups with no extra indexes.
 *
 * OrderBookSnapshot and PriceHistory store `canonicalOutcomeId` alongside
 * `sourceOutcomeId` so reads don't need to re-translate via the matcher every
 * request. The seed script resolves canonical ids once and writes them in.
 */

export const LOGICAL_MARKET_MODEL = "LogicalMarket";
export const VENUE_MARKET_MODEL = "VenueMarket";
export const ORDERBOOK_SNAPSHOT_MODEL = "OrderBookSnapshot";
export const PRICE_HISTORY_MODEL = "PriceHistory";

export const LOGICAL_MARKET_COLLECTION = "logical_markets";
export const VENUE_MARKET_COLLECTION = "venue_markets";
export const ORDERBOOK_SNAPSHOT_COLLECTION = "venue_orderbook_snapshots";
export const PRICE_HISTORY_COLLECTION = "price_history";

const OutcomeRefSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const VenueMarketRefSchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    outcomeMap: { type: Map, of: String, required: true },
  },
  { _id: false },
);

export const logicalMarketSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ["open", "closed", "resolved"] },
    quoteCurrency: { type: String, required: true, default: "USD" },
    outcomes: { type: [OutcomeRefSchema], required: true },
    venueMarkets: { type: [VenueMarketRefSchema], required: true },
  },
  {
    timestamps: true,
    collection: LOGICAL_MARKET_COLLECTION,
    versionKey: false,
  },
);
logicalMarketSchema.index({ status: 1 });
logicalMarketSchema.index({ category: 1 });
logicalMarketSchema.index({ endDate: 1 });

const VenueNativeOutcomeSchema = new Schema(
  {
    sourceOutcomeId: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

export const venueMarketSchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    logicalMarketId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ["open", "closed", "resolved"] },
    quoteCurrency: { type: String, required: true, default: "USD" },
    outcomes: { type: [VenueNativeOutcomeSchema], required: true },
    // Live data fields written by the worker
    image: { type: String },
    icon: { type: String },
    description: { type: String },
    featured: { type: Boolean },
    conditionId: { type: String },
    clobTokenIds: { type: [String] },
    volume: { type: Number },
    liquidity: { type: Number },
  },
  {
    timestamps: true,
    collection: VENUE_MARKET_COLLECTION,
    versionKey: false,
  },
);
venueMarketSchema.index({ venue: 1, sourceMarketId: 1 }, { unique: true });
venueMarketSchema.index({ logicalMarketId: 1 });
venueMarketSchema.index({ status: 1 });

const OrderBookLevelSchema = new Schema(
  {
    price: { type: Number, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const SnapshotOutcomeSchema = new Schema(
  {
    sourceOutcomeId: { type: String, required: true },
    canonicalOutcomeId: { type: String, required: true },
    bids: { type: [OrderBookLevelSchema], required: true },
    asks: { type: [OrderBookLevelSchema], required: true },
  },
  { _id: false },
);

export const orderBookSnapshotSchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    logicalMarketId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    outcomes: { type: [SnapshotOutcomeSchema], required: true },
  },
  {
    timestamps: true,
    collection: ORDERBOOK_SNAPSHOT_COLLECTION,
    versionKey: false,
  },
);
orderBookSnapshotSchema.index(
  { venue: 1, sourceMarketId: 1, timestamp: -1 },
);
orderBookSnapshotSchema.index({ logicalMarketId: 1, timestamp: -1 });

const PriceHistoryPointSchema = new Schema(
  {
    timestamp: { type: Date, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

export const priceHistorySchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    logicalMarketId: { type: String, required: true },
    sourceOutcomeId: { type: String, required: true },
    canonicalOutcomeId: { type: String, required: true },
    points: { type: [PriceHistoryPointSchema], required: true },
  },
  {
    timestamps: true,
    collection: PRICE_HISTORY_COLLECTION,
    versionKey: false,
  },
);
priceHistorySchema.index(
  { venue: 1, sourceMarketId: 1, sourceOutcomeId: 1 },
  { unique: true },
);
priceHistorySchema.index({ logicalMarketId: 1, canonicalOutcomeId: 1 });

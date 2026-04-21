import mongoose, { Schema, type Model } from 'mongoose';

// Collection names — must match backend/src/mongo/schemas.ts
const LOGICAL_MARKET_COLLECTION = 'logical_markets';
const VENUE_MARKET_COLLECTION = 'venue_markets';
const ORDERBOOK_SNAPSHOT_COLLECTION = 'venue_orderbook_snapshots';
const PRICE_HISTORY_COLLECTION = 'price_history';

const OutcomeRefSchema = new Schema(
  { id: { type: String, required: true }, label: { type: String, required: true } },
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

const VenueNativeOutcomeSchema = new Schema(
  {
    sourceOutcomeId: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false },
);

const OrderBookLevelSchema = new Schema(
  { price: { type: Number, required: true }, size: { type: Number, required: true } },
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

const PriceHistoryPointSchema = new Schema(
  { timestamp: { type: Date, required: true }, price: { type: Number, required: true } },
  { _id: false },
);

const logicalMarketSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ['open', 'closed', 'resolved'] },
    quoteCurrency: { type: String, required: true, default: 'USD' },
    outcomes: { type: [OutcomeRefSchema], required: true },
    venueMarkets: { type: [VenueMarketRefSchema], required: true },
  },
  { timestamps: true, collection: LOGICAL_MARKET_COLLECTION, versionKey: false },
);

const venueMarketSchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    logicalMarketId: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ['open', 'closed', 'resolved'] },
    quoteCurrency: { type: String, required: true, default: 'USD' },
    outcomes: { type: [VenueNativeOutcomeSchema], required: true },
    image: { type: String },
    icon: { type: String },
    description: { type: String },
    featured: { type: Boolean, default: false },
    conditionId: { type: String },
    clobTokenIds: { type: [String] },
    volume: { type: Number },
    liquidity: { type: Number },
  },
  { timestamps: true, collection: VENUE_MARKET_COLLECTION, versionKey: false },
);
venueMarketSchema.index({ venue: 1, sourceMarketId: 1 }, { unique: true });
venueMarketSchema.index({ logicalMarketId: 1 });
venueMarketSchema.index({ status: 1 });

const orderBookSnapshotSchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    logicalMarketId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    outcomes: { type: [SnapshotOutcomeSchema], required: true },
  },
  { timestamps: true, collection: ORDERBOOK_SNAPSHOT_COLLECTION, versionKey: false },
);
orderBookSnapshotSchema.index({ venue: 1, sourceMarketId: 1, timestamp: -1 });
orderBookSnapshotSchema.index({ logicalMarketId: 1, timestamp: -1 });

const priceHistorySchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceMarketId: { type: String, required: true },
    logicalMarketId: { type: String, required: true },
    sourceOutcomeId: { type: String, required: true },
    canonicalOutcomeId: { type: String, required: true },
    points: { type: [PriceHistoryPointSchema], required: true },
  },
  { timestamps: true, collection: PRICE_HISTORY_COLLECTION, versionKey: false },
);
priceHistorySchema.index(
  { venue: 1, sourceMarketId: 1, sourceOutcomeId: 1 },
  { unique: true },
);
priceHistorySchema.index({ logicalMarketId: 1, canonicalOutcomeId: 1 });

function getOrCreateModel<T>(name: string, schema: Schema): Model<T> {
  if (mongoose.modelNames().includes(name)) {
    return mongoose.model<T>(name);
  }
  return mongoose.model<T>(name, schema);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

export const getLogicalMarketModel = (): AnyModel =>
  getOrCreateModel('LogicalMarket', logicalMarketSchema);

export const getVenueMarketModel = (): AnyModel =>
  getOrCreateModel('VenueMarket', venueMarketSchema);

export const getOrderBookSnapshotModel = (): AnyModel =>
  getOrCreateModel('OrderBookSnapshot', orderBookSnapshotSchema);

export const getPriceHistoryModel = (): AnyModel =>
  getOrCreateModel('PriceHistory', priceHistorySchema);

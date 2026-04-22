import mongoose, { Schema, type Model } from 'mongoose';

// Collection names — must match backend/src/mongo/schemas.ts
const LOGICAL_MARKET_COLLECTION = 'logical_markets';
const VENUE_MARKET_COLLECTION = 'venue_markets';
const LOGICAL_EVENT_COLLECTION = 'logical_events';
const VENUE_EVENT_COLLECTION = 'venue_events';
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
    eventId: { type: String },
    eventTitle: { type: String },
    // Parent event (e.g. "2026 FIFA World Cup Winner"). One event → N child markets.
    // A standalone binary market has no logicalEventId.
    logicalEventId: { type: String },
    // Label for this market when rendered as a row of its parent event
    // (Polymarket's `groupItemTitle`, e.g. "Brazil"; Kalshi's `yes_sub_title`).
    groupItemTitle: { type: String },
  },
  { timestamps: true, collection: LOGICAL_MARKET_COLLECTION, versionKey: false },
);
logicalMarketSchema.index({ logicalEventId: 1 });

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
    // Link to parent venue event. Events are cross-venue at the logical layer, but
    // each venue carries its own native event id (Polymarket eventId, Kalshi event_ticker).
    logicalEventId: { type: String },
    sourceEventId: { type: String },
    groupItemTitle: { type: String },
    /** Public web URL to trade this market on the venue (set by worker / seed). */
    tradingUrl: { type: String },
  },
  { timestamps: true, collection: VENUE_MARKET_COLLECTION, versionKey: false },
);
venueMarketSchema.index({ venue: 1, sourceMarketId: 1 }, { unique: true });
venueMarketSchema.index({ logicalMarketId: 1 });
venueMarketSchema.index({ status: 1 });
venueMarketSchema.index({ logicalEventId: 1 });
venueMarketSchema.index({ venue: 1, sourceEventId: 1 });

/**
 * LogicalEvent = a cross-venue grouping of markets that share one real-world question.
 *
 * Examples:
 *   - Polymarket "2026 FIFA World Cup Winner" (60 child markets, one per team)
 *   - Kalshi "Who will the next Pope be?" (mutually_exclusive, 7 candidates)
 *   - A standalone binary like "Will Fed cut rates?" is also modeled as an event
 *     with a single child market — keeps the frontend uniform.
 *
 * Phase 1: one LogicalEvent is produced per venue-native event (no cross-venue merging yet).
 * Phase 2: the LLM matcher collapses Polymarket + Kalshi events that describe the same question.
 */
const logicalEventSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String },
    description: { type: String },
    image: { type: String },
    icon: { type: String },
    category: { type: String, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ['open', 'closed', 'resolved'] },
    // True when exactly one child market resolves Yes (e.g. "Who wins?"). Drives UI grouping.
    mutuallyExclusive: { type: Boolean, default: false },
    childMarketIds: { type: [String], required: true },
    venues: { type: [String], required: true },
    volume24h: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    liquidity: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true, collection: LOGICAL_EVENT_COLLECTION, versionKey: false },
);
logicalEventSchema.index({ status: 1 });
logicalEventSchema.index({ category: 1 });
logicalEventSchema.index({ endDate: 1 });
logicalEventSchema.index({ volume24h: -1 });

const venueEventSchema = new Schema(
  {
    venue: { type: String, required: true },
    sourceEventId: { type: String, required: true },
    logicalEventId: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String },
    description: { type: String },
    image: { type: String },
    icon: { type: String },
    category: { type: String, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, required: true, enum: ['open', 'closed', 'resolved'] },
    mutuallyExclusive: { type: Boolean, default: false },
    childSourceMarketIds: { type: [String], required: true },
    volume24h: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    liquidity: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true, collection: VENUE_EVENT_COLLECTION, versionKey: false },
);
venueEventSchema.index({ venue: 1, sourceEventId: 1 }, { unique: true });
venueEventSchema.index({ logicalEventId: 1 });
venueEventSchema.index({ status: 1 });

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

export const getLogicalEventModel = (): AnyModel =>
  getOrCreateModel('LogicalEvent', logicalEventSchema);

export const getVenueEventModel = (): AnyModel =>
  getOrCreateModel('VenueEvent', venueEventSchema);

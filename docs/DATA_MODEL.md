# Data model

Six MongoDB collections. All schemas live in `backend/src/mongo/schemas.ts` (read side) and `worker/src/schemas.ts` (write side). The worker is the **only process that writes**.

## Collections

### `logical_markets`
The canonical market as the aggregator sees it. `_id` is the canonical market id (a string, not an ObjectId) so lookups are primary-key reads.

| Field | Type | Purpose |
|---|---|---|
| `_id` | string | canonical id (e.g. `"polymarket-abc123"`, `"kalshi-KXETHD-24"`) |
| `title` | string | |
| `category` | string | |
| `endDate` | Date | resolution deadline |
| `status` | `"open" \| "closed" \| "resolved"` | |
| `quoteCurrency` | `"USD"` | normalised at ingest |
| `outcomes` | `Array<{ id, label }>` | canonical outcomes |
| `venueMarkets` | `Array<VenueMarketRef>` | `{ venue, sourceMarketId, outcomeMap: Map<venueOutcomeId, canonicalOutcomeId> }` |
| `logicalEventId` | string | fk → `logical_events._id` |
| `groupItemTitle` | string? | row label within a multi-outcome event |

**Indexes:** `{ status: 1 }`, `{ category: 1 }`, `{ endDate: 1 }`, `{ logicalEventId: 1 }`.

### `venue_markets`
Venue-native metadata per (venue, sourceMarketId). Denormalised for read speed.

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | |
| `venue` | string enum | |
| `sourceMarketId` | string | venue-native id |
| `logicalMarketId` | string | fk → `logical_markets._id` |
| `title`, `category`, `endDate`, `status`, `quoteCurrency` | | venue-native fields |
| `outcomes` | `Array<{ sourceOutcomeId, label }>` | venue-native outcomes |
| `tradingUrl` | string? | deep link to this market on the venue's own UI |
| `volume`, `liquidity` | number | venue-reported figures |

**Indexes:** `{ venue, sourceMarketId }` unique, `{ logicalMarketId }`, `{ status }`.

### `logical_events`
Event groupings — e.g. "2026 FIFA World Cup Winner" containing 60 team markets. Single-market events exist too (a standalone binary is wrapped as a one-child event).

| Field | Type | Purpose |
|---|---|---|
| `_id` | string | e.g. `"polymarket-event-12345"` |
| `title` | string | |
| `category`, `endDate`, `status` | | |
| `mutuallyExclusive` | boolean | true for "who wins X?" events |
| `childMarketIds` | string[] | fk → `logical_markets._id[]` |
| `venues` | string[] | which venues list this event |
| `volume`, `volume24h`, `liquidity` | number | |

**Indexes:** `{ status: 1 }`, `{ category: 1 }`, `{ endDate: 1 }`.

### `venue_events`
Venue-native event metadata, mirroring `logical_events` with raw venue fields.

**Indexes:** `{ venue, sourceEventId }` unique, `{ logicalEventId }`.

### `venue_orderbook_snapshots`
L2 snapshot per (venue, sourceMarketId) with bids/asks per outcome. The worker appends a new snapshot on every orderbook sync run.

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | |
| `venue` | string enum | |
| `sourceMarketId` | string | |
| `logicalMarketId` | string | fk → `logical_markets._id` |
| `timestamp` | Date | |
| `outcomes` | `Array<SnapshotOutcome>` | `{ sourceOutcomeId, canonicalOutcomeId, bids: Level[], asks: Level[] }` |

Storing `canonicalOutcomeId` alongside `sourceOutcomeId` avoids re-consulting the matcher on every read.

**Indexes:** `{ venue, sourceMarketId, timestamp: -1 }`, `{ logicalMarketId, timestamp: -1 }`.

### `price_history`
Time series per (venue, sourceMarketId, sourceOutcomeId). One document per series; `points[]` is an embedded array.

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | |
| `venue`, `sourceMarketId`, `logicalMarketId`, `sourceOutcomeId`, `canonicalOutcomeId` | | keys |
| `points` | `Array<{ timestamp: Date, price: number }>` | 0–1 probability |

**Indexes:** `{ venue, sourceMarketId, sourceOutcomeId }` unique, `{ logicalMarketId, canonicalOutcomeId }`.

## Cross-venue identity

No venue shares IDs with another. `logicalMarketId` is synthesised by the worker at ingest time using a stable composition rule per venue (see [ARCHITECTURE.md](ARCHITECTURE.md)). Cross-venue grouping of the same real-world event uses an LLM-based title/outcome matcher; the `MarketMatcher` interface isolates this logic.

**Kalshi binary → canonical outcome mapping.** A Kalshi binary like "Will France win?" stores both YES and NO as canonical outcomes. The `outcomeMap` in `venueMarkets` maps `ticker-yes` → `canonicalId-0` and `ticker-no` → `canonicalId-1`.

## Write path

Only the **worker** writes to MongoDB. The worker:

1. Connects to Mongo on startup.
2. Runs all three sync functions immediately (`market-sync`, `orderbook-sync`, `price-sync`).
3. Schedules repeating runs via `node-cron` (markets: every 15 min, orderbooks: every 2 min, prices: every hour).
4. Each sync function uses `findOneAndUpdate` with `upsert: true` — idempotent by design.

The backend API is read-only.

---

**Last updated:** 2026-04-22

# Data model — Phase 1

Four MongoDB collections plus the canonical shapes defined in `shared/`. All schemas live in `backend/src/mongo/schemas.ts`.

## Collections

### `logical_markets`
The canonical event as the aggregator sees it. `_id` is the canonical market id (a string, not an ObjectId) so lookups are primary-key reads.

| Field | Type | Purpose |
|---|---|---|
| `_id` | string | canonical id (e.g. `"fifa-2026-winner"`) |
| `title` | string | |
| `category` | string | |
| `endDate` | Date | resolution deadline |
| `status` | `"open" \| "closed" \| "resolved"` | |
| `quoteCurrency` | `"USD"` | Phase 1 literal |
| `outcomes` | `Array<{ id, label }>` | canonical outcomes owned by this market |
| `venueMarkets` | `Array<VenueMarketRef>` | `{ venue, sourceMarketId, outcomeMap: Map<venueOutcomeId, canonicalOutcomeId> }` |

**Indexes:** `{ status: 1 }`, `{ category: 1 }`, `{ endDate: 1 }`.
Rationale: the listing endpoint filters by `status` and sorts by `endDate`.

### `venue_markets`
Venue-native metadata per (venue, sourceMarketId). Denormalised for read speed; joins against `logical_markets` use `logicalMarketId`.

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | |
| `venue` | string enum | |
| `sourceMarketId` | string | venue-native id |
| `logicalMarketId` | string | fk → `logical_markets._id` |
| `title`, `category`, `endDate`, `status`, `quoteCurrency` | | venue-native fields |
| `outcomes` | `Array<{ sourceOutcomeId, label }>` | venue-native outcomes |

**Indexes:** `{ venue, sourceMarketId }` unique, `{ logicalMarketId }`, `{ status }`.
Rationale: most reads hit `(venue, sourceMarketId)` directly; `logicalMarketId` joins support the detail endpoint.

### `venue_orderbook_snapshots`
L2 snapshot per (venue, sourceMarketId) with bids/asks per outcome. Phase 1 seeds one snapshot per market; Phase 2 will append periodic snapshots.

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | |
| `venue` | string enum | |
| `sourceMarketId` | string | |
| `logicalMarketId` | string | fk → `logical_markets._id` |
| `timestamp` | Date | when the snapshot was taken |
| `outcomes` | `Array<SnapshotOutcome>` | per-outcome `{ sourceOutcomeId, canonicalOutcomeId, bids: Level[], asks: Level[] }` |

**Indexes:** `{ venue: 1, sourceMarketId: 1, timestamp: -1 }`, `{ logicalMarketId: 1, timestamp: -1 }`.
Rationale: the /quote endpoint fetches the latest snapshot per (venue, sourceMarketId); the detail endpoint fetches all snapshots for a `logicalMarketId`. Storing `canonicalOutcomeId` alongside `sourceOutcomeId` avoids re-consulting the matcher on every request.

### `price_history`
Time-series per (venue, sourceMarketId, sourceOutcomeId). One document per series; `points[]` is an embedded array.

| Field | Type | Purpose |
|---|---|---|
| `_id` | ObjectId | |
| `venue`, `sourceMarketId`, `logicalMarketId`, `sourceOutcomeId`, `canonicalOutcomeId` | | keys |
| `points` | `Array<{ timestamp: Date, price: number }>` | 0–1 probability |

**Indexes:** `{ venue, sourceMarketId, sourceOutcomeId }` unique, `{ logicalMarketId, canonicalOutcomeId }`.
Rationale: the detail endpoint queries by `logicalMarketId` to assemble per-outcome perVenue arrays.

## Cross-venue identity (§5a)

No venue shares ids with another venue. `logicalMarketId` is synthesised by the matcher:

- **Phase 1** — `StaticSeededMatcher` hardcodes `(venue, sourceMarketId) → logicalMarketId`.
- **Phase 2** — `LlmTitleMatcher` produces assignments from `(title, outcomes, endDate, category)` with a human-review queue for low-confidence pairs. Same interface; no schema change required.

**Kalshi binary → canonical outcome mapping.** A Kalshi binary market like "Will France win?" maps `{ kalshi_yes: "france" }` via its `outcomeMap`. The NO side is left unmapped in Phase 1 — the aggregator ignores venue outcomes that have no canonical counterpart.

## Writes

**Only one process writes: `npm run seed` (or the extracted `seed()` function).** The seed:

1. Refuses to run unless `MONGO_URL`'s hostname is in `{localhost, 127.0.0.1, ::1, mongodb}` — hard guardrail against accidental prod wipes.
2. Drops all four collections.
3. Iterates `SEEDED_LOGICAL_MARKETS`, calling each adapter's `getMarket`/`getOrderBook`/`getPriceHistory`, and inserts normalised documents. `canonicalOutcomeId` is resolved via `StaticSeededMatcher` at write time.
4. Is idempotent — running it twice yields identical state.

No runtime write paths exist in Phase 1.

---

**Last updated:** 2026-04-21

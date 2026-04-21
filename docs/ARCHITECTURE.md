# Vibeahack Architecture — Phase 1

> One-page overview. The system is a **true** aggregator of prediction markets (not a switcher like chance.cc) that produces best-executable quotes across Polymarket, Kalshi, and Myriad. Phase 1 ships the full vertical slice against mocked venue data.

## The data flow, end-to-end

```
fixtures (TS modules)          Nest DI graph              React (Vite)
┌──────────────────┐           ┌──────────────┐           ┌────────────────┐
│ polymarket/      │           │ VenuesModule │           │ Markets page   │
│ kalshi/          │           │ MatchingModule│          │ Market detail: │
│ myriad/          │           │ MongoModule  │           │  - PriceChart  │
│   markets.ts     │           │ MarketsModule│           │  - QuoteModule │
│   order-books.ts │           │ HealthModule │           │    (route sel) │
│   price-history  │           └──────┬───────┘           │  - VenueBreak… │
└────────┬─────────┘                  │                   └────────▲───────┘
         │ imported by                │ HTTP /api/v1/*             │ fetch
         ▼                            ▼                            │
  ┌─────────────┐   registers   ┌────────────────┐                 │
  │ VenueAdapter│◄─────────────►│ MongoDB        │                 │
  │  (Poly/     │               │ logical_markets│─────────────────┘
  │   Kalshi/   │   read by     │ venue_markets  │
  │   Myriad)   │               │ snapshots      │
  └─────┬───────┘               │ price_history  │
        │ provides VenueMarket, └──────▲─────────┘
        │ OrderBook, PriceHistory      │ writes
        ▼                              │
  ┌─────────────────┐   seed via       │
  │ StaticSeeded    │──────────────────┘
  │ Matcher         │  (npm run seed)
  │ (canonical →    │
  │  venue refs)    │
  └─────────────────┘
        ▲
        │ consumed by
        │
  ┌─────────────────┐
  │ MarketsService  │
  │  buildQuote()   │  ← pure aggregation engine (no I/O)
  │  mergeOrderBooks│
  │  buildUnified…  │
  └─────────────────┘
```

## Layers (top to bottom)

### 1. `shared/` — the contract
Zod schemas + inferred TS types. Imported by both backend and frontend. Every API DTO has a zod schema; frontend parses responses through the schema at the boundary for runtime safety. `shared/src/` files: `venue.ts`, `market.ts`, `orderbook.ts`, `price-history.ts`, `quote.ts`, `api-dto.ts`, `error.ts`.

### 2. Venue adapters — the seam
Each venue lives under `backend/src/venues/<venue>/` and implements the single `VenueAdapter` interface (`venue-adapter.interface.ts`). Adapters speak venue-native (sourceMarketId, sourceOutcomeId) and return 0–1 decimal prices. **Zero dependencies on Mongo, Nest, or HTTP.** Phase 1 implementations read from typed fixtures; Phase 2 implementations will call live APIs.

Fixtures cover §5b: 3 logical markets (tri-venue FIFA, dual-venue midterm, single-venue BTC) plus one resolved Super Bowl market; ≥3 depth levels on every outcome except the canonical §6a France case (intentionally single-level to make single:polymarket return `unfilledSize: 100`).

### 3. `MarketMatcher` — the canonical-id seam (§5a)
Market IDs are **not** shared across venues; matching is a title/outcome problem. Phase 1 fulfils the `MarketMatcher` interface with `StaticSeededMatcher`, which hardcodes `logicalMarketId` assignments and (for Kalshi binaries) maps the YES side of each binary to a single canonical outcome. The interface will be replaced by an LLM-based `LlmTitleMatcher` in Phase 2 — the API surface is unchanged.

### 4. Mongo — the persistence layer
Four collections, one write path (seed script via adapters → `StaticSeededMatcher` → Mongo):

- `logical_markets` — canonical events, outcomes, venueMarkets[] refs
- `venue_markets` — venue-native metadata per (venue, sourceMarketId)
- `venue_orderbook_snapshots` — L2 bids/asks per venue market, timestamped, with both `sourceOutcomeId` and `canonicalOutcomeId` so reads don't re-translate
- `price_history` — time series per (venue, sourceMarketId, sourceOutcomeId)

Indexed for primary-key lookups and the few filtered reads (status, logicalMarketId). See `docs/DATA_MODEL.md`.

### 5. Aggregation engine — the correctness core
`backend/src/aggregation/`:

- `buildQuote(input)` — pure function. Given per-venue levels for a specific (outcome, side), produces the `optimal` greedy-split route and one `single:<venue>` route for each venue with depth (§6a). Splits emitted in execution order; single-venue routes in venue-enum order.
- `buildUnifiedPriceSeries(perVenue)` — mean across venues at each timestamp.
- `round4`, `round2` — rounding helpers.

**Zero I/O.** Unit tests cover the §8 (a)–(e) cases including the canonical $600/$500+$100 split (`src/aggregation/quote-engine.spec.ts`).

### 6. REST controllers — the public surface
Three endpoints (§6) plus health:

- `GET /health` — liveness/readiness + Mongo ping
- `GET /markets` — list with status filter
- `GET /markets/:id` — detail with venue breakdown + price history
- `POST /markets/:id/quote` — multi-route quote

Every controller + DTO is annotated with `@nestjs/swagger` decorators (§6b); Swagger UI serves at `/api/v1/docs`. Body validation uses `ZodValidationPipe` against the shared zod schemas; all errors flow through a global `ErrorEnvelopeFilter` that emits the §6b envelope.

### 7. React frontend (Vite)
Three panes on the market detail page (§7):

1. **PriceChart** (recharts) — unified best-price line + optional per-venue overlays
2. **QuoteModule** — live `POST /quote` on input change; renders every route as a selectable card; optimal pre-selected with **Best** badge; preview updates on selection change; disabled `Execute` button
3. **VenueBreakdown** — table of per-venue best bid/ask + total depth

Data fetching via `@tanstack/react-query`; DTOs parsed through shared zod schemas at the client boundary.

## Phase 1 → Phase 2 boundary

| Concern | Phase 1 | Phase 2 |
|---|---|---|
| Venue data source | JSON/TS fixtures | Live venue APIs (same `VenueAdapter` interface) |
| Market matching | `StaticSeededMatcher` (hardcoded) | `LlmTitleMatcher` (embeddings + LLM adjudication, review queue) |
| Orderbook freshness | One seeded snapshot per market | Periodic pull or websocket stream |
| Auth / wallet | None | Required |
| Order execution | Disabled "Execute" button | Real order routing |
| Currency | `"USD"` singleton | Proper multi-currency with FX |

Seams are explicit — Phase 2 slots into the same interfaces.

## Correctness guarantees (what's tested)

- Unit tests: aggregation engine over §8 (a)–(e) including the canonical $600/$500+$100 split.
- E2E tests (supertest against a live Nest app + live Mongo): all four endpoints, validation errors, status filtering, the canonical `/quote` case asserted exactly, venue-outage resilience.
- The §13 bootstrap gate runs both test suites inside the container.

---

**Last updated:** 2026-04-21

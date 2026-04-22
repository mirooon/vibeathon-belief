# Architecture

One-page overview. Belief is a **true aggregator** of prediction markets — not a switcher — that produces best-executable quotes across Polymarket, Kalshi, and Myriad from a single unified view.

## Data flow, end-to-end

```
Live venue APIs                Worker (indexer)            MongoDB
┌─────────────────┐            ┌──────────────────┐        ┌────────────────────┐
│ Polymarket      │──markets──►│ market-sync      │───────►│ logical_markets    │
│ gamma-api /     │──orderbook►│ orderbook-sync   │───────►│ venue_markets      │
│ clob API        │──prices───►│ price-sync       │───────►│ logical_events     │
├─────────────────┤            └──────────────────┘        │ venue_events       │
│ Kalshi          │                every 15m / 2m / 1h     │ orderbook_snapshots│
│ trade-api/v2    │                                        │ price_history      │
├─────────────────┤                                        └────────┬───────────┘
│ Myriad          │                                                 │ reads
│ api-v2          │            NestJS backend                       │
└─────────────────┘            ┌──────────────────┐                 │
                               │ MarketsModule    │◄────────────────┘
                               │ BeliefModule     │
                               │ HealthModule     │
                               └────────┬─────────┘
                                        │ HTTP /api/v1/*
                                        ▼
                               React frontend (Vite)
                               ┌────────────────────┐
                               │ /belief  (search)  │
                               │ /markets (list)    │
                               │ /markets/:id       │
                               │   PriceChart       │
                               │   QuoteModule      │
                               │   VenueBreakdown   │
                               └────────────────────┘
```

## Layers

### 1. `shared/` — the contract
Zod schemas + inferred TS types. Imported by both backend and frontend. Every API DTO has a Zod schema; the frontend parses responses through the schema at the fetch boundary for runtime safety.

### 2. Worker — the indexer
`worker/src/` runs three independent sync loops against the live venue APIs:

- **market-sync** — fetches all open events and markets from each venue, upserts into `logical_markets`, `venue_markets`, `logical_events`, `venue_events`. Runs on startup then every 15 minutes.
- **orderbook-sync** — fetches current L2 bids/asks for all open venue markets. Myriad (AMM-based) synthesises levels by sampling the quote endpoint at ascending notionals. Runs every 2 minutes.
- **price-sync** — fetches price history points and appends to `price_history`. Runs every hour.

Each venue has its own typed API client under `worker/src/adapters/` (`polymarket.client.ts`, `kalshi.client.ts`, `myriad.client.ts`). Clients normalise prices to 0–1 probabilities and sizes to shares/contracts before returning.

### 3. Market matching — cross-venue identity
No venue shares IDs with another. `logicalMarketId` is synthesised by the worker at ingest time:

- Polymarket markets become `polymarket-<marketId>`
- Kalshi markets become `kalshi-<ticker>`
- Myriad markets become `myriad-<networkId>:<id>`

Cross-venue grouping of the same real-world event (e.g. "France wins the World Cup" listed on all three venues) is handled by an LLM-based title/outcome matcher that emits a shared `logicalMarketId`. The `MarketMatcher` interface isolates this logic; implementations can be swapped without touching the aggregation engine.

### 4. MongoDB — the persistence layer
Six collections, one write path (the worker):

- `logical_markets` — canonical market per underlying question; outcomes; venue refs
- `venue_markets` — venue-native metadata per (venue, sourceMarketId)
- `logical_events` — event groupings (e.g. "2026 FIFA World Cup Winner" with 60 child markets)
- `venue_events` — venue-native event metadata
- `venue_orderbook_snapshots` — timestamped L2 snapshots; both `sourceOutcomeId` and `canonicalOutcomeId` stored to avoid re-translating on reads
- `price_history` — time series per (venue, sourceMarketId, sourceOutcomeId)

See [DATA_MODEL.md](DATA_MODEL.md) for indexes and rationale.

### 5. Aggregation engine — the correctness core
`backend/src/aggregation/`:

- `buildQuote(input)` — **pure function**. Given per-venue L2 levels for a specific (outcome, side), produces the `optimal` greedy-split route and one `single:<venue>` route per venue with depth. Walks asks/bids by price; emits splits in execution order.
- `buildUnifiedPriceSeries(perVenue)` — mean across venues at each timestamp.
- `round4`, `round2` — rounding helpers.

Zero I/O. Unit tests cover all branching paths including the canonical cross-venue split case.

### 6. REST controllers — the public surface
- `GET /health` — liveness/readiness + Mongo ping
- `GET /markets` — list with status filter
- `GET /markets/:id` — detail with venue breakdown + price history
- `POST /markets/:id/quote` — multi-route quote
- `POST /belief/search` — semantic search via in-process embeddings (`@xenova/transformers`)

Body validation uses `ZodValidationPipe` against shared Zod schemas. All errors flow through a global `ErrorEnvelopeFilter`.

### 7. React frontend (Vite)
Three panes on the market detail page:

1. **PriceChart** (recharts) — unified best-price line + optional per-venue overlays
2. **QuoteModule** — live `POST /quote` on input change; every route as a selectable card; optimal pre-selected with **Best** badge; disabled `Execute` button
3. **VenueBreakdown** — per-venue best bid/ask + total depth table

Data fetching via `@tanstack/react-query`; DTOs parsed through shared Zod schemas at the client boundary.

---

**Last updated:** 2026-04-22

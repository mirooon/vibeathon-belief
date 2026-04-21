# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibeahack is a prediction markets aggregator — a TypeScript monorepo (npm workspaces) that unifies pricing and order routing across Polymarket, Kalshi, and Myriad. Phase 1 runs fully mocked with seeded MongoDB fixtures; no live venue API calls happen yet.

## Commands

### Stack Management
```bash
./scripts/start.sh             # build, start full stack, seed, tail logs
./scripts/start.sh --detach    # same but returns immediately
./scripts/start.sh --down      # stop everything
./scripts/bootstrap.sh         # CI-like: build → up → seed → e2e
```

### Backend
```bash
npm run start:dev --workspace=backend     # watch mode dev server
npm run seed --workspace=backend          # drop + repopulate MongoDB (idempotent)
npm run test --workspace=backend          # unit tests (Jest)
npm run test:e2e --workspace=backend      # supertest e2e (requires MongoDB running)
npm run lint:backend
npm run typecheck:backend
```

### Frontend
```bash
npm run dev --workspace=frontend          # Vite dev server (hot reload)
npm run lint:frontend
npm run typecheck:frontend
```

### Shared
```bash
npm run build:shared                      # compile shared Zod schemas to dist/
```

### Root-level
```bash
npm run build                             # build all three packages in order
```

## Architecture

### Monorepo Layout
- **`shared/`** — Zod schemas and TypeScript types only. This is the API contract. Both backend and frontend import from here. Build this first when changing types.
- **`backend/`** — NestJS REST API, MongoDB via Mongoose, aggregation engine, semantic search.
- **`frontend/`** — Vite + React SPA (React Router, TanStack Query, recharts).

### Key Backend Modules

**Venue Adapters** (`backend/src/venues/<venue>/`)  
Implement the `VenueAdapter` interface: `getMarket()`, `getOrderBook()`, `getPriceHistory()`. Phase 1: reads typed TS fixture files. Phase 2: will call live APIs. Adapters have zero Nest/Mongo/HTTP dependencies.

**Market Matching** (`backend/src/matching/`)  
Translates `(venue, sourceMarketId, sourceOutcomeId)` → `(logicalMarketId, canonicalOutcomeId)`. Phase 1: `StaticSeededMatcher` with hardcoded assignments. Phase 2: `LlmTitleMatcher` with embeddings.

**Aggregation Engine** (`backend/src/aggregation/`)  
`buildQuote()` and `buildUnifiedPriceSeries()` are **pure functions** (zero I/O). `buildQuote()` uses a greedy-split algorithm: walks asks/bids by price, emits one `optimal` route + one `single:<venue>` route per venue with depth. Prices always 0–1 (probabilities). Fees are `notional × takerBps / 10_000` per split.

**MongoDB** (`backend/src/mongo/`)  
Four collections: `logical_markets`, `venue_markets`, `venue_orderbook_snapshots`, `price_history`. The seeder is the only writer. Read paths use primary-key lookups.

**REST API** — all under `/api/v1/`:
- `GET /markets` — list with status filter
- `GET /markets/:id` — detail + price history + venue breakdown
- `POST /markets/:id/quote` — multi-route quote
- `POST /belief/search` — semantic market search (embeddings via @xenova/transformers, runs in-process)
- `GET /health` — liveness probe
- Swagger UI at `/api/v1/docs`

All errors use `ErrorEnvelopeFilter` → `{ error: { code, message, details } }` with SCREAMING_SNAKE_CASE codes.

### Frontend Data Flow

`api/client.ts` (typed fetch wrapper) → `api/hooks.ts` (React Query hooks) → page components. React Query handles caching, retry, and staleTime. Responses are parsed against shared Zod schemas.

Routes: `/` (market list), `/markets/:id` (detail: PriceChart + QuoteModule + VenueBreakdown), `/belief` (semantic search).

## Non-Obvious Patterns

**All prices are 0–1 probabilities.** Kalshi's native cents are converted at the adapter boundary. Nothing downstream is in cents or percentages.

**Seeding is destructive and idempotent.** `npm run seed` drops and repopulates MongoDB every run. It refuses to execute against non-localhost hostnames.

**Kalshi binary mapping:** only the YES side of a Kalshi binary market maps to a canonical outcome. NO is ignored.

**E2E tests require `--runInBand`.** Serializes supertest calls to avoid seeding race conditions.

**Shared must be built before backend/frontend.** `npm run build:shared` compiles to `shared/dist/`; the other packages import from there.

**@xenova/transformers runs in-process.** The belief search embeddings model downloads on first use and runs in the backend Node process — no external API call.

## Environment

Copy `.env.example` to `.env`. Key vars:
```
MONGO_URL=mongodb://mongodb:27017/vibeahack
BACKEND_PORT=3000
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000/api/v1
```

Venue fees are in `backend/src/config/venue-fees.ts`: Polymarket 0 bps, Kalshi 200 bps, Myriad 100 bps.

## Phase 1 → Phase 2 Seams

These are the explicit swap points when moving to live data:
- `VenueAdapter` implementations → live API calls
- `StaticSeededMatcher` → `LlmTitleMatcher`
- Fixture seeder → periodic orderbook snapshot ingestion

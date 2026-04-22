# Belief

> You tell us what you think will happen. We find every matching market across Polymarket, Kalshi, Myriad — and every venue after them — compare the odds in real time, and get you the best price. No more jumping between tabs. No more missing the cheaper bet on the other platform. Just tell us what you think, and we handle the rest.

Prediction markets are already a $127B industry and the next big financial primitive — but liquidity is scattered across 170+ venues and the UX is broken. **LI.FI made chains invisible for swaps. Belief makes prediction market venues invisible for bets.**

## What it does

- **Semantic market search** — type a belief in plain English ("France wins the World Cup", "Fed doesn't cut in June") and get ranked matches across all venues via concept-vector embeddings.
- **Unified market view** — one page per real-world event, aggregated across every venue that lists it.
- **Best-price chart** — tracks the best available price across venues over time; per-venue overlays optional.
- **Cross-venue quote routing** — the buy/sell module finds the optimal execution route, including order splits when a single venue lacks depth. Shows every route (optimal split + one per venue) so you can compare.

## Prerequisites

- Docker Desktop (tested with Docker Engine 29.x, Compose v2)
- Node 22+ only needed if you want to run scripts outside the container

## Run everything

```bash
./scripts/start.sh
```

Builds and starts MongoDB, the backend API, the frontend, and the indexer worker. The worker syncs live markets, orderbooks, and price history from Polymarket, Kalshi, and Myriad on startup, then keeps them fresh on a schedule (markets every 15 min, orderbooks every 2 min, price history every hour).

```bash
./scripts/start.sh --detach    # start and return immediately
./scripts/start.sh --down      # stop everything
```

## URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000/api/v1 |
| Swagger / OpenAPI | http://localhost:3000/api/v1/docs |
| MongoDB | `mongodb://localhost:27017/vibeahack` |

## Try it

```bash
# Semantic belief search
curl -X POST http://localhost:3000/api/v1/belief/search \
  -H "Content-Type: application/json" \
  -d '{"query":"France wins the World Cup"}' | jq .

# List live markets
curl http://localhost:3000/api/v1/markets | jq .

# Cross-venue quote (splits the order across venues for best execution)
curl -X POST http://localhost:3000/api/v1/markets/<market-id>/quote \
  -H "Content-Type: application/json" \
  -d '{"outcomeId":"<outcome-id>","side":"buy","size":600}' | jq .
```

In the UI: go to `/belief`, type what you think will happen, and click a result. On the market page, switch between the quote routes in the right pane — blended price, splits, and fees update live. The optimal route is pre-selected with a **Best** badge.

## Project layout

```
vibeahack/
  shared/        # Zod schemas + inferred TS types (the contract)
  backend/       # NestJS aggregation API + belief search
  frontend/      # Vite + React (market list, market detail, /belief)
  worker/        # Indexer — syncs live markets, orderbooks, and prices from all venues
  mcp/           # stdio MCP server exposing belief routing and quotes
  docker-compose.yml
  scripts/start.sh
  docs/
```

## Documentation

- [docs/API.md](docs/API.md) — every endpoint, error envelope, worked example
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — indexer, adapter pattern, aggregation engine, data flow
- [docs/ADDING_A_VENUE.md](docs/ADDING_A_VENUE.md) — step-by-step recipe to onboard a new venue
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — Mongo collections, indexes, rationale
- [docs/TESTING.md](docs/TESTING.md) — unit + e2e test runners

---

**Last updated:** 2026-04-22

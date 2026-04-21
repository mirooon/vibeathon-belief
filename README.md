# Vibeahack

> Prediction markets aggregator across Polymarket, Kalshi, and Myriad. One unified market view, one price chart that tracks best-available price across venues, one buy/sell module whose quote reflects the **best-executable route** — including cross-venue splits when a single venue lacks depth.

**Phase 1 is mocked.** All venue data comes from typed fixtures seeded into MongoDB. No live venue API calls, no auth, no order execution.

## Prerequisites

- Docker Desktop (tested with Docker Engine 29.x, Compose v2)
- Node 22+ only needed if you want to run scripts outside the container

## Run everything

```bash
./scripts/bootstrap.sh
```

One command brings up MongoDB + backend, seeds the fixtures, and runs the full e2e suite inside the container. Exits non-zero on any failure. Idempotent — run it as many times as you like.

To also start the frontend:
```bash
docker compose up -d frontend
```

## URLs

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000/api/v1
- **Swagger / OpenAPI:** http://localhost:3000/api/v1/docs
- **MongoDB:** `mongodb://localhost:27017/vibeahack` (container network: `mongodb:27017`)

## Canonical demo

```bash
# Full detail for the tri-venue FIFA market
curl http://localhost:3000/api/v1/markets/fifa-2026-winner

# The $600 split case (Polymarket 500 @ 0.51 + Kalshi 100 @ 0.535)
curl -X POST http://localhost:3000/api/v1/markets/fifa-2026-winner/quote \
  -H "Content-Type: application/json" \
  -d '{"outcomeId":"france","side":"buy","size":600}' | jq .
```

In the UI: open the FIFA market, switch between the four quote routes in the right pane, and watch blended price / splits / fees update live. Optimal is pre-selected with a **Best** badge.

## Documentation

- [docs/API.md](docs/API.md) — every endpoint, error envelope, worked canonical example
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — adapter pattern, aggregation engine, data flow diagram
- [docs/ADDING_A_VENUE.md](docs/ADDING_A_VENUE.md) — 5-step recipe to onboard a new venue
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — Mongo collections, indexes, rationale
- [docs/TESTING.md](docs/TESTING.md) — unit + e2e test runners, fixture conventions

## Project layout

```
vibeahack/
  shared/        # zod schemas + inferred TS types (the contract)
  backend/       # NestJS aggregation API
  frontend/      # Vite + React + route selector
  docker-compose.yml
  scripts/bootstrap.sh
  docs/
```

---

**Last updated:** 2026-04-21

# Testing

Two test suites, both runnable locally and inside the container.

## Unit tests — aggregation engine

Location: `backend/src/**/*.spec.ts`.
Runner: `backend/jest.config.ts`.

```bash
npm run test --workspace=backend
# or directly:
npx jest --config backend/jest.config.ts
```

Covers the §8 (a)–(e) cases on the pure aggregation engine, **including the canonical §6a $600 / $500+$100 split**. Runs in milliseconds, no Mongo required.

## E2E tests — full API against live Mongo

Location: `backend/test/e2e/*.e2e-spec.ts`.
Runner: `backend/test/jest-e2e.config.ts`.

```bash
# Prereq: Mongo running (via docker compose or locally)
docker compose up -d mongodb

# Inside the backend container (the canonical path):
docker compose exec backend npm run test:e2e

# Or from the host against a local Mongo:
MONGO_URL=mongodb://localhost:27017/vibeahack npm run test:e2e --workspace=backend
```

Tests build a full Nest app via `@nestjs/testing`, wire up the real AppModule, connect to the real Mongo, and hit every endpoint through supertest. Every response is parsed through the shared zod schemas for structural validation.

### Coverage checklist (what's asserted — §8)

- `GET /health` — status `ok`, mongo `up`, uptime ≥ 0.
- `GET /markets` — empty DB (post-wipe), after seed (4 items), `?status=open` (3 items), `?status=resolved` (1 item), tri-venue market lists all 3 venues.
- `GET /markets/:id` — tri-venue breakdown, single-venue (BTC) = just Polymarket, unknown id → 404 MARKET_NOT_FOUND, resolved market surfaces `status=resolved`, `from`/`to` query narrows price history.
- `POST /markets/:id/quote` — missing `outcomeId` → 400, negative size → 400, unknown outcome → 404 OUTCOME_NOT_FOUND, unknown market → 404 MARKET_NOT_FOUND, resolved → 409 MARKET_NOT_OPEN, **canonical case BUY 600 france** asserts exact splits + blendedPrice + route order, single-venue market returns optimal + single:polymarket only, **venue outage resilience** (delete Kalshi snapshot, quote still returns 200 with Poly + Myriad).

### The canonical split case as a worked example

```ts
const res = await http
  .post("/api/v1/markets/fifa-2026-winner/quote")
  .send({ outcomeId: "france", side: "buy", size: 600 })
  .expect(200);

const body = QuoteResponseSchema.parse(res.body);
expect(body.routes.map(r => r.id)).toEqual([
  "optimal", "single:polymarket", "single:kalshi", "single:myriad",
]);

const optimal = body.routes[0];
expect(optimal.splits).toEqual([
  { venue: "polymarket", size: 500, avgPrice: 0.51, fees: 0 },
  { venue: "kalshi",     size: 100, avgPrice: 0.535, fees: 1.07 },
]);
expect(optimal.blendedPrice).toBeCloseTo(0.5142, 4);
```

## Adding a test

- **Unit test**: add a spec next to the pure function under test (e.g. `aggregation/*.spec.ts`). Import the pure function, exercise it with synthetic inputs, assert on the output.
- **E2E test**: add a `describe` block (or a new file under `test/e2e/`). Use the helpers in `test/helpers.ts`: `createTestApp`, `wipeDb`, `reseed`, `deleteSnapshotByVenue`. Parse responses through the shared zod schemas.

## Fixture conventions

- Fixtures live under `backend/src/venues/<venue>/fixtures/` as typed TS modules.
- Every logical market referenced in `StaticSeededMatcher.SEEDED_LOGICAL_MARKETS` must have a corresponding `VenueMarket` in each listed venue's `markets.ts`.
- Order-book levels: `bids` sorted **descending** by price, `asks` sorted **ascending**.
- Prices in 0–1 decimals. Sizes in shares/contracts. Timestamps ISO-8601.
- The canonical §6a case (France on `fifa-2026-winner`) deliberately uses single-level books on each venue. Do not “fix” this — it is what makes `single:polymarket` return `unfilledSize: 100`. Other outcomes have ≥3 depth levels per side.

## Forbidden patterns (§13a.7)

The §13 verification gate greps the repo for:

- `\.only\(`, `\.skip\(`, `xdescribe\(`, `xit\(`, `fdescribe\(`, `fit\(` — must return **zero matches** across our source and tests.
- `: any\b`, ` as any\b` in `backend/src`, `frontend/src`, `shared/src` — must return **zero matches**.
- `eslint-disable` — flagged and must be justified; current occurrences are three CLI scripts disabling `no-console`.

A red e2e test fails the bootstrap script with a non-zero exit code — never skip or silence one.

---

**Last updated:** 2026-04-21

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

Covers the pure aggregation engine: single-venue passthrough, two-venue best-price selection, cross-venue order splitting, venue outage resilience (one adapter throws → remaining routes still returned), and fully-unfillable size (`unfilledSize > 0` on every route). Runs in milliseconds, no Mongo required.

## E2E tests — full API against live Mongo

Location: `backend/test/e2e/*.e2e-spec.ts`.
Runner: `backend/test/jest-e2e.config.ts`.

```bash
# Prereq: Mongo running
docker compose up -d mongodb

# Inside the backend container (the canonical path):
docker compose exec backend npm run test:e2e

# Or from the host against a local Mongo:
MONGO_URL=mongodb://localhost:27017/vibeahack npm run test:e2e --workspace=backend
```

Tests build a full Nest app via `@nestjs/testing`, wire up the real `AppModule`, connect to the real Mongo, and hit every endpoint through supertest. Every response is parsed through the shared Zod schemas for structural validation.

### Coverage checklist

- `GET /health` — status `ok`, mongo `up`, uptime ≥ 0.
- `GET /markets` — status filtering, DTO shape, venue list.
- `GET /markets/:id` — known id, unknown id → 404 `MARKET_NOT_FOUND`, resolved market, `from`/`to` query narrows price history.
- `POST /markets/:id/quote` — missing `outcomeId` → 400, negative size → 400, unknown outcome → 404 `OUTCOME_NOT_FOUND`, unknown market → 404 `MARKET_NOT_FOUND`, resolved → 409 `MARKET_NOT_OPEN`, cross-venue split (asserts exact splits, blendedPrice, route ordering), single-venue market (optimal + one single route), **venue outage resilience** (delete one venue's snapshot → 200 with remaining routes).
- `POST /belief/search` — returns ranked results, score field present.

### The canonical split case

```ts
const res = await http
  .post("/api/v1/markets/<id>/quote")
  .send({ outcomeId: "<outcome-id>", side: "buy", size: 600 })
  .expect(200);

const body = QuoteResponseSchema.parse(res.body);
expect(body.routes[0].id).toBe("optimal");
expect(body.routes[0].isOptimal).toBe(true);
expect(body.routes[0].filledSize).toBe(600);
expect(body.routes[0].unfilledSize).toBe(0);
expect(body.routes[0].blendedPrice).toBeCloseTo(0.5142, 4);
```

## Adding a test

- **Unit test**: add a spec next to the pure function (`aggregation/*.spec.ts`). Import the function, exercise it with synthetic inputs, assert on the output.
- **E2E test**: add a `describe` block under `test/e2e/`. Use the helpers in `test/helpers.ts`: `createTestApp`, `wipeDb`, `reseed`, `deleteSnapshotByVenue`. Parse responses through the shared Zod schemas.

## Forbidden patterns

The CI check greps the repo for:

- `\.only\(`, `\.skip\(`, `xdescribe\(`, `xit\(`, `fdescribe\(`, `fit\(` — must return zero matches.
- `: any\b`, ` as any\b` in `backend/src`, `frontend/src`, `shared/src` — must return zero matches.
- `eslint-disable` — flagged and must be justified; current occurrences are CLI scripts disabling `no-console`.

A red test must be fixed, not silenced.

---

**Last updated:** 2026-04-22

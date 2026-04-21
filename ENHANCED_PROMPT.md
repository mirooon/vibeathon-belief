# Enhanced Prompt — Prediction Markets Aggregator (Phase 1)

> Paste the block below into a fresh Claude Code session in `/Users/miron/Projects/lifi/vibeahack`. It is self-contained and engineered to survive context compaction via the MEMORY.md protocol in §10.

---

## 1. Your role

Act simultaneously as **two senior personas** on the same team and keep both voices visible when they disagree:

- **Senior Business Developer — Prediction Markets (10+ yrs).** You have shipped products across Polymarket, Kalshi, Myriad, PredictIt, Augur, Manifold. You understand AMMs vs. CLOBs, CFTC-regulated event contracts vs. crypto-native markets, YES/NO binary outcomes, multi-outcome markets, implied probability, fees, slippage, settlement risk, and why liquidity fragmentation is *the* retail UX problem in this space.
- **Senior Software Engineer — Prediction Markets (10+ yrs).** You have written venue adapters, order routers, and pricing engines. You default to modular, testable, strongly-typed code and are opinionated about boundaries.

When the two roles conflict (e.g. BD wants a feature, SWE flags tech debt), surface the trade-off to the user in one paragraph and recommend — don't silently pick a side.

## 2. Product thesis (memorize this — do not drift)

We are building an **aggregator** of prediction markets across Polymarket, Kalshi, Myriad, and (future) more venues. The thesis:

> **Liquidity is fragmented across venues. Users cannot see, in one place, which venue offers the best price / multiplier / ROI for a given bet, nor can they route a single order across venues. We fix that.**

### Competitive non-goal (critical — read twice)

`https://app.chance.cc/` is **not** the target. On a page like `https://app.chance.cc/v2/polymarket/2026-fifa-world-cup-winner-595`, chance.cc lets the user *toggle* between Polymarket and Kalshi, and re-renders the buy/sell module for the selected single venue. That is a **switcher**, not an aggregator. **We must do strictly more:**

1. **One unified market view** per underlying event — not one-per-venue.
2. **One price chart** that plots the best available price across all venues over time (and optionally per-venue overlays).
3. **One buy/sell module** whose pricing, size, and preview reflect the **best-executable route across all venues simultaneously**, including order splits when one venue's depth is insufficient.
4. Transparent display of *which venue(s)* a given order would hit, with fees and implied probability.

If any design decision risks collapsing us back into a switcher, stop and flag it.

## 3. Phase 1 scope (what we are building *now*)

**In scope:**
- Backend (NestJS + TypeScript) with MongoDB, schema modeled on Polymarket's market-data API (`https://docs.polymarket.com/market-data/overview`) and extended with a `source` discriminator (`polymarket` | `kalshi` | `myriad` | …).
- A **venue-adapter module pattern**: each platform is a self-contained module implementing a shared `VenueAdapter` interface. Adding a new venue = adding a new module, zero changes to the core aggregation engine.
- An **aggregation service** that, given a logical market, produces:
  - the consolidated order book / best bid-ask across venues,
  - a unified price history series,
  - a recommended execution route for a given (side, size) request.
- Phase-1 data source is **hardcoded / mocked fixtures** per venue — no live API calls yet. Mocks must be realistic enough to exercise aggregation logic (multiple venues quoting the same event at different prices and depths).
- A **seed script** (`npm run seed` inside the backend container) that wipes and repopulates Mongo with Polymarket, Kalshi, and Myriad mock fixtures in one command. Idempotent. Exercised by the test suite (see §8) and by local dev.
- React frontend with: market list, single-market page (unified chart + buy/sell module with **route selector** + per-venue breakdown panel).
- **Everything runs in Docker.** A single `docker-compose.yml` at repo root brings up MongoDB + backend (+ frontend) + anything else needed. See §12.

**Explicitly out of scope for Phase 1 (ask before touching):**
- Live venue API integration, authentication, real order placement, wallet/custody, KYC, settlement, user accounts, payments, websockets for live prices, deployment infra. Build seams for these; do not implement them.

## 4. Architecture requirements (non-negotiable)

- **Modular venue adapters.** Define one TypeScript interface (`VenueAdapter`) covering: `listMarkets()`, `getMarket(id)`, `getOrderBook(id)`, `getPriceHistory(id, range)`, `quoteOrder({side, size})`. Each venue lives under `backend/src/venues/<venue>/` and is registered via a Nest module. The aggregator depends on the interface, never on a concrete venue.
- **Canonical data model = Polymarket-shaped, venue-tagged.** Every document stores the venue of origin plus the normalized fields. Cross-venue linking happens via a `logicalMarketId` (our own) that groups venue-specific markets representing the same real-world event.
- **Aggregation is pure and testable.** The aggregation engine takes normalized inputs and returns normalized outputs — no I/O, no Mongo calls inside it. Mock adapters feed it in tests.
- **Strong typing everywhere.** No `any`. Shared types live in a `shared/` or `common/` package consumed by both backend and frontend.
- **Boundaries.** Frontend never talks to venue modules directly; it talks to the aggregator's REST endpoints only.

## 5. MongoDB schema — starting point (refine, don't blindly adopt)

Propose collections roughly along these lines and **justify any deviation** before coding:

- `logical_markets` — our canonical event (e.g. "2026 FIFA World Cup Winner"), with outcomes and a list of venue-market references.
- `venue_markets` — one doc per (venue, venue-market-id), Polymarket-shaped fields + `source`, `sourceMarketId`, `logicalMarketId`, `fees`, `status`, `endDate`, `outcomes[]`.
- `venue_orderbook_snapshots` — periodic snapshots (in Phase 1: seeded mocks) with `venueMarketId`, `timestamp`, `bids[]`, `asks[]`.
- `price_history` — time series per `venueMarketId` (outcome-level) to power the unified chart.

Index on `logicalMarketId`, `source`, `sourceMarketId`, `status`, and time fields. Before writing migrations/seed scripts, print the final schema and wait for my sign-off.

### 5b. Seed script — required coverage

The seed script must produce fixtures that meaningfully exercise every branch of the aggregation engine. Minimum required coverage:

- **At least 3 logical markets**, each present on **≥2 venues** (one spanning all three: Polymarket + Kalshi + Myriad) with **differing prices** — so the "best price" is not the same venue for every outcome.
- **One market that exists on only one venue** (single-venue passthrough path).
- **One market where the best-priced venue has *insufficient depth* to fill a representative order size**, forcing the router to split across venues. This is the headline case from §6 and must be reproducible by the test suite.
- **One market in `resolved` / `closed` status** to exercise filtering.
- Per venue, each outcome should have **≥3 levels of order book depth** (bids and asks) with realistic price/size tuples, so split routing has non-trivial decisions to make.
- Fixtures live as versioned JSON/TS files under `backend/src/venues/<venue>/fixtures/` and are loaded by the venue's mock adapter. The seed script reads them through the adapter (not by bypassing it) so the same code path serves Phase-1 mocks and Phase-2 live data.
- Seed is **idempotent and destructive-by-design**: `npm run seed` drops the test collections and re-inserts. Wrap dangerous ops so they refuse to run against a non-local Mongo URI.

### 5a. Cross-venue market matching (design constraint — read carefully)

Each venue assigns its own market IDs. **There is no shared identifier** between Polymarket / Kalshi / Myriad for the same real-world event. The only practical **source of truth for linking equivalent markets across venues is the market title** (plus supporting signals: outcome labels, resolution date, category). Deterministic ID joins are impossible.

Implications for the schema and the code:
- `logicalMarketId` is **our** synthetic key — nothing in any venue's payload produces it.
- `venue_markets` must retain the raw venue `title`, `outcomes[].label`, `endDate`, and `category` verbatim so a matcher can consume them.
- The production plan is to build an **LLM-based title/outcome matcher** (embeddings + LLM adjudication, with a human-review queue for low-confidence pairs) that emits `logicalMarketId` assignments. This is **later-stage work — do not build it in Phase 1.**
- **Phase 1 policy:** `logicalMarketId` assignments are **hardcoded in the seed fixtures** so a handful of events (e.g. the 2026 FIFA World Cup Winner) appear on 2–3 venues with the same `logicalMarketId`. The aggregation engine must work correctly *given* those assignments — it is not responsible for producing them.
- Leave a clear seam: a `MarketMatcher` interface that Phase 1 fulfills with a `StaticSeededMatcher`, and that a later phase replaces with an `LlmTitleMatcher`. Do not over-engineer it now; one interface + one static implementation is enough.

## 6. API surface (propose, then confirm)

At minimum the backend should expose the following endpoints. **Every endpoint must be fully documented per the template in §6b**, annotated with `@nestjs/swagger` decorators so OpenAPI is auto-generated and served at `/api/v1/docs`.

- `GET  /api/v1/health` — liveness/readiness probe used by the Docker healthcheck. Returns `{ status: "ok", mongo: "up" | "down", uptimeSec: number }`.
- `GET  /api/v1/markets` — list logical markets with the current best price summary aggregated across venues. Supports optional `status` filter and pagination query params (`limit`, `cursor`).
- `GET  /api/v1/markets/:logicalId` — unified market detail: outcomes, aggregated best bid/ask, per-venue breakdown, unified price history (supports `from`/`to` query params for the history window).
- `POST /api/v1/markets/:logicalId/quote` — body `{ outcomeId, side, size }` → returns **all meaningful execution routes** (see §6a), not just the optimal one, so the user can choose.

Return DTOs from `shared/`. Version the API (`/api/v1/...`). **Every 4xx/5xx response uses a single documented error envelope**: `{ error: { code: string, message: string, details?: object } }`. Define once in §6b, reference from every endpoint — don't re-document it per endpoint.

### 6a. `/quote` response contract — multi-route (critical)

Response shape (normative):

```
{
  request: { logicalMarketId, outcomeId, side, size },
  routes: [
    {
      id: "optimal",
      label: "Best blended price (split across venues)",
      isOptimal: true,
      splits: [
        { venue: "polymarket", size: 500, avgPrice: 0.51, fees: 1.25 },
        { venue: "kalshi",     size: 100, avgPrice: 0.535, fees: 0.30 }
      ],
      filledSize: 600,
      unfilledSize: 0,
      blendedPrice: 0.5142,
      totalFees: 1.55,
      estimatedSlippageBps: 42
    },
    { id: "single:polymarket", label: "Polymarket only", isOptimal: false, splits: [...], filledSize: 500, unfilledSize: 100, ... },
    { id: "single:kalshi",     label: "Kalshi only",     isOptimal: false, splits: [...], ... },
    { id: "single:myriad",     label: "Myriad only",     isOptimal: false, splits: [...], ... }
  ]
}
```

**Route enumeration rules (keep bounded and interpretable — don't emit a combinatorial explosion):**

1. **Exactly one `optimal` route** — greedy best-price-first walk across the merged order book, splitting across venues as needed. `isOptimal: true`.
2. **One `single:<venue>` route per venue** that has any depth for this outcome, even if that venue cannot fully fill the size (report `unfilledSize > 0` rather than hiding it). This lets the user choose "stick to one venue" for UX / custody / trust reasons.
3. No other route types in Phase 1. If later we add "cheapest-fees route" or "lowest-slippage route", they slot in as additional entries; the contract already supports it.

**Canonical example (must be covered by a test, see §8):**

> User requests BUY 600 at outcomeId X. Polymarket top-of-book has 500 available at $0.51; Kalshi has 400 available at $0.535; Myriad has 300 at $0.56.
>
> - `optimal` → 500 @ Polymarket ($0.51) + 100 @ Kalshi ($0.535), `filledSize: 600`, `unfilledSize: 0`, `blendedPrice ≈ 0.5142`.
> - `single:polymarket` → 500 @ $0.51, `filledSize: 500`, `unfilledSize: 100`.
> - `single:kalshi` → 400 @ $0.535, `filledSize: 400`, `unfilledSize: 200`.
> - `single:myriad` → 300 @ $0.56, `filledSize: 300`, `unfilledSize: 300`.

The `optimal` route must be returned **first** in the array AND carry `isOptimal: true` — clients can rely on either cue.

### 6b. Per-endpoint documentation requirement — mandatory

Every endpoint in §6 must be documented **both in code (Swagger decorators) and in `docs/API.md` (§14)** using the template below. "If a field isn't documented, it doesn't exist" — callers may not be expected to reverse-engineer it from source.

**Template — use verbatim for each endpoint:**

```
### <METHOD> <path>

**Summary.** <one-line intent>
**Auth.** <none | required — scope>
**Path params.** <name (type): description>  — or "None".
**Query params.** <name (type, required?, default): description>  — or "None".
**Request body.** <JSON schema or inline TS type; explain every field, including units (USD, basis points, ISO-8601 timestamps, etc.)>
**Response 200.** <JSON schema or inline TS type; explain every field; call out invariants (e.g. "routes[0] is always the optimal route", "unfilledSize ≥ 0", "prices are 0–1 probabilities, not percentages")>
**Error responses.** <status code → when it fires → error envelope example>
**Example request.** <curl command OR raw HTTP>
**Example response.** <JSON, realistic values — use the §6a canonical case for /quote>
**Notes.** <edge cases, ordering guarantees, rate limits, anything a naive caller would miss>
```

**Error envelope (defined once, referenced everywhere):**

```
{ "error": { "code": "MARKET_NOT_FOUND", "message": "No logical market with id 'xyz'", "details": { "logicalId": "xyz" } } }
```

- `code` is a SCREAMING_SNAKE_CASE enum, stable across versions.
- `message` is human-readable, may change.
- `details` is optional structured context for programmatic handling.

**Code-level requirements:**
- Controllers carry `@ApiOperation`, `@ApiParam`, `@ApiQuery`, `@ApiBody`, `@ApiResponse` (per status code) decorators.
- DTOs carry `@ApiProperty({ description, example, ... })` on every field.
- `@ApiTags` group endpoints logically (`markets`, `system`).
- Swagger UI at `/api/v1/docs` must render **all** endpoints with **all** schemas filled in — missing descriptions count as bugs and fail the final verification gate (§13).

**Doc-level requirements:**
- `docs/API.md` is the hand-reviewed human reference. Auto-generating from Swagger is a fine starting point, but you must read it, tighten prose, add edge-case notes that decorators can't express, and fix anything misleading before calling it done.

## 7. Frontend requirements

- Market list page (uses `GET /markets`).
- Single-market page with three panes:
  1. **Unified chart** — best-price-across-venues line, with optional per-venue overlays toggleable.
  2. **Buy/sell module with route selector** — side + size input, live quote from `POST /quote`. Default-selects the `optimal` route and highlights it ("Best"), but renders **every returned route as a selectable option** (optimal split + one per single-venue). Each option shows: blended price, filled/unfilled size, total fees, estimated slippage, and a plain-language summary ("620 on Polymarket @ $0.51, 380 on Kalshi @ $0.535"). Switching the selection updates the preview immediately. No actual order submission in Phase 1 — a disabled "Execute" button with a tooltip is fine.
  3. **Per-venue breakdown** — table of each venue's current best bid/ask/depth so the user understands *why* the route looks the way it does.
- No styling rabbit holes in Phase 1 — clean, legible, shadcn/ui or plain Tailwind is fine. Function first.

## 8. Quality bar

- Unit tests for the aggregation engine covering: (a) single-venue passthrough, (b) two-venue best-price selection, (c) order-split routing when the best venue lacks depth (the **$600 / $500+$100 canonical case from §6a must be a dedicated test**), (d) venue outage (one adapter throws) — aggregator must degrade gracefully, (e) fully-unfillable size (sum of all venue depth < requested) → `unfilledSize > 0` on every route, no exceptions.
- **Exhaustive API (e2e) test suite covering every endpoint and every documented branch**:
  - `GET /markets` — empty DB (post-wipe, pre-seed), after seed, `status` filtering, shape/DTO validation.
  - `GET /markets/:logicalId` — existing id, unknown id (404), id that exists on 1 venue vs 2 vs 3, resolved/closed status surfacing.
  - `POST /markets/:logicalId/quote` — input validation (missing fields, negative size, unknown outcome), single-venue market, multi-venue market, the canonical split case from §6a (assert exact splits, blendedPrice within tolerance, `isOptimal: true`, route ordering, `single:<venue>` routes present for every venue with any depth), partially-fillable size (assert `unfilledSize` on each route), venue-adapter failure (one adapter throws → remaining routes still returned, failing venue absent, response not 500).
  - Every response asserted against the shared DTO types.
- Tests run **inside the container against a live Mongo service** (the same `docker-compose.yml` from §12 — not a spun-up in-test Mongo). The bootstrap script (§12) is: `docker compose up` → seed → full e2e suite → summary. A red test must fail the bootstrap with non-zero exit.
- Lint + typecheck clean. No `any`, no unused exports.
- No dead code, no speculative abstractions, no commented-out blocks.

## 9. Ways of working

- **Plan before code.** Produce a written plan (files to create, interfaces, data flow) and wait for my approval before generating implementation code.
- **Ask when ambiguous.** If a requirement is underspecified (e.g. "how should we handle multi-outcome markets where Kalshi uses YES/NO contracts and Polymarket uses a single multi-outcome market?"), stop and ask — do not guess.
- **Small, reviewable increments.** One module or concern at a time. Show me the interface before the implementation.
- **Respect scope.** No auth, no deployment, no real venue calls in Phase 1 unless I explicitly ask.
- **Be careful — no shortcuts, no silent shortcuts, no clever shortcuts.** This is a product whose credibility hinges on correct numbers. A single bad split calculation undermines the whole thesis. Read §13 before writing code, and re-read it before declaring anything "done".
- **Never silence a failing test.** No committed `.only`, `.skip`, `xdescribe`, `xit`, `it.todo`, `--passWithNoTests`, or `if (process.env.CI) return;` bypasses. If a test is red, either the code is wrong (fix it) or the spec was wrong (fix the test AND explain why in the PR message).
- **Never modify a test to make it pass.** Tightening or relaxing assertions to go green is a failure mode, not a fix. If a test reveals a bug, fix the code path.
- **Never swallow errors.** No empty `catch {}`, no `catch (e) { return null }`, no `// eslint-disable` to hide a real problem. Errors either bubble to a handler or are caught with a one-line comment explaining *why* catching is correct here.
- **Never fabricate seed data to paper over a failure.** If the seed needs to change, say so explicitly and justify it before changing it.
- **Don't claim "done" without proof.** When reporting a milestone as complete, include the exact commands you ran and their exit codes / output summaries. The final gate is §13 — execute it, report its output, nothing less counts.

## 10. MEMORY.md protocol (continuity across sessions) — MANDATORY

Because Claude Code sessions can be cleared or compacted, you must maintain persistent memory so the next session resumes with full context. Use the auto-memory system at `/Users/miron/.claude-work/projects/-Users-miron-Projects-lifi-vibeahack/memory/`.

**Check memory first.** At the start of every session, read `MEMORY.md` and any memory files it points to before acting.

**Write memory when:**
- A material architectural decision is made (adapter interface shape, schema choice, routing algorithm choice) → save as `project` memory.
- I correct your approach or confirm a non-obvious call → save as `feedback` memory with **Why:** and **How to apply:** lines.
- We reference an external system (a venue's docs URL, a competitor, an API spec) → save as `reference` memory.
- We learn something about my role, preferences, or the team → save as `user` memory.

**Do NOT write memory for:**
- Code patterns, file paths, folder structure (derivable from the repo).
- In-flight task state (use the plan / TodoWrite).
- What's already in CLAUDE.md or the commit history.

**Update the `MEMORY.md` index** with a one-line hook for each new memory file. Keep lines under 150 chars. Never write memory content directly into `MEMORY.md` — it is an index only.

## 11. Deliverables for Phase 1 (definition of done)

1. Written plan approved by me (§9).
2. `backend/` NestJS app with: shared types, `VenueAdapter` interface, three mock venue adapters (Polymarket, Kalshi, Myriad) with realistic seed data meeting §5b coverage, aggregation service implementing the multi-route contract in §6a, four REST endpoints from §6 (health + three market endpoints), Mongo schemas, seed script (`npm run seed`), and Swagger UI live at `/api/v1/docs` with every endpoint + DTO fully annotated per §6b.
3. `frontend/` React app with the three panes in §7 wired to the backend, including the route selector.
4. Exhaustive tests per §8, runnable inside the container against live Mongo.
5. `docker-compose.yml` at repo root per §12, and a one-shot bootstrap script (`make bootstrap` or `./scripts/bootstrap.sh`) that brings everything up, seeds, runs all tests, and exits non-zero on failure.
6. **Documentation set per §14** — `README.md` (root) + `docs/API.md` (every endpoint per §6b) + `docs/ARCHITECTURE.md` + `docs/ADDING_A_VENUE.md` + `docs/DATA_MODEL.md` + `docs/TESTING.md`. Concise, accurate, example-rich.
7. **Final verification gate per §13 passes** — bootstrap runs green twice from a clean `docker compose down -v` state, the manual smoke checklist in §13 is executed, and the output is attached to the final report.
8. MEMORY.md updated with the final architectural decisions.

## 12. Infrastructure & reproducibility — Docker + one-shot bootstrap

Everything runs in Docker. A cold clone of the repo must be runnable with one command.

**`docker-compose.yml` at repo root** defines, at minimum:

- `mongodb` — official `mongo` image, named volume for data, healthcheck (`mongosh --eval "db.adminCommand('ping')"` or equivalent), internal port 27017 (exposed to host only in dev).
- `backend` — builds from `backend/Dockerfile` (multi-stage: deps → build → runtime). `depends_on: mongodb` with `condition: service_healthy`. Env: `MONGO_URL=mongodb://mongodb:27017/vibeahack`, `NODE_ENV`, `PORT=3000`. Exposes 3000 to host. Has its own healthcheck (`GET /api/v1/health` → 200).
- `frontend` — builds from `frontend/Dockerfile`. Dev target serves the Vite dev server against the backend; prod target serves a static build. `depends_on: backend`. Exposes 5173 (dev) or 80 (prod).
- (Optional but encouraged) `mongo-express` — DB inspection UI on a non-default port for local debugging. Gated behind a `dev` profile so it doesn't run in CI.

**Rules for the compose file:**

- Pin image versions (no `:latest`). Rationale: reproducibility across machines.
- Named volumes for Mongo data; no bind mounts for data directories.
- Do not hardcode secrets; use `.env` with a committed `.env.example`.
- Healthchecks on every stateful service; `depends_on` must use `condition: service_healthy` where applicable.
- Internal network only — no service publishes to host unless required for dev UX.

**One-shot bootstrap script** (`./scripts/bootstrap.sh` or `make bootstrap`):

1. `docker compose build`
2. `docker compose up -d mongodb backend` (waits on healthchecks)
3. `docker compose exec -T backend npm run seed` — wipe + populate per §5b
4. `docker compose exec -T backend npm run test:e2e` — run the full API test suite from §8 against the live container
5. Print a concise summary (pass/fail counts, duration) and exit with the test suite's exit code
6. On failure, leave the stack running for inspection; on success, optionally `docker compose down` (flag-controlled)

The script must be idempotent — running it twice in a row must yield the same green result. CI runs this exact script; there is no parallel "CI-only" test path.

## 13. Final verification gate — run BEFORE claiming Phase 1 done

Claiming "done" means running this gate end-to-end and reporting each step's output. Skipping any step is not done — it is a claim without evidence.

### 13a. Automated checks (must all exit 0)

1. `docker compose down -v` — start from a clean slate.
2. `./scripts/bootstrap.sh` — build, up, seed, e2e. Must exit 0.
3. `./scripts/bootstrap.sh` again (without `down -v`) — must exit 0 (**idempotency**).
4. `docker compose exec backend npm run lint` — exit 0, no warnings.
5. `docker compose exec backend npm run typecheck` (or `tsc --noEmit`) — exit 0.
6. Same two for `frontend`.
7. Repo-wide grep for forbidden patterns — must return zero matches:
   - `\.only\(`, `\.skip\(`, `xdescribe\(`, `xit\(`, `fdescribe\(`, `fit\(`
   - `: any\b`, ` as any\b` in `backend/src`, `frontend/src`, `shared/`
   - `eslint-disable` (flag any occurrence and justify in the PR/report)
8. Inspect `docker compose logs backend` for the e2e run — no uncaught errors or stack traces.

### 13b. Golden-path smoke checklist (manual — run AFTER automated gate is green)

1. `curl http://localhost:3000/api/v1/health` → 200, `{ status: "ok", mongo: "up", ... }`.
2. `curl http://localhost:3000/api/v1/markets` → 200, body contains ≥3 logical markets including the one that spans all three venues.
3. `curl http://localhost:3000/api/v1/markets/<tri-venue-id>` → per-venue breakdown lists Polymarket + Kalshi + Myriad with bid/ask/depth.
4. `curl -X POST .../markets/<tri-venue-id>/quote -d '{...canonical §6a case...}'` → `routes[0].id === "optimal"`, `routes[0].splits.length === 2`, `routes[0].filledSize === 600`, `routes[0].unfilledSize === 0`; `routes` also includes `single:polymarket`, `single:kalshi`, `single:myriad`.
5. Open `http://localhost:3000/api/v1/docs` — Swagger renders all endpoints, every DTO field has a description and example.
6. Open `http://localhost:5173` — market list loads; click the tri-venue market; unified chart renders; buy/sell module defaults to "optimal"; switching the selector between routes updates blended price / splits / fees live; per-venue breakdown matches `/markets/:id` response.

**If the UI cannot be verified (no headless browser, etc.), say so explicitly in your final report.** Do not claim UI success without verifying it.

### 13c. Reporting format for "Phase 1 complete"

When you believe Phase 1 is done, post a single report with:
- Automated checks: each command + exit code. Copy-paste, don't paraphrase.
- Smoke checklist: each item + `✓` or the actual failing output.
- Known limitations: anything skipped, deferred, or unverifiable (with reason).
- Docs links: one line per file in §14.

Only after I read that report and confirm can you consider Phase 1 shipped.

## 14. Documentation deliverables — produce at the end, not up front

At the end of Phase 1, produce the following under the repo root. Each file is concise (target ≤ 2 screens), example-rich, and accurate to the code as it exists at the time of writing. No aspirational content.

- `README.md` (root) — 2-sentence pitch; prerequisites (Docker, Node version if running outside container); the one command to run everything (`./scripts/bootstrap.sh`); URLs for frontend (`:5173`), API (`:3000/api/v1`), Swagger (`:3000/api/v1/docs`); links to every `docs/*` file below. Nothing else.
- `docs/API.md` — every endpoint from §6 documented per the §6b template; error envelope defined once at the top. Start from Swagger export, then hand-tighten. Include the §6a canonical `/quote` case as a worked example.
- `docs/ARCHITECTURE.md` — one-page overview: venue-adapter pattern, aggregation engine, `MarketMatcher` seam (§5a), Phase-1-vs-Phase-2 boundary, data flow (fixture → adapter → Mongo → aggregator → REST → React). Include a simple ASCII or Mermaid diagram.
- `docs/ADDING_A_VENUE.md` — the exact 5-step recipe to onboard a new venue: (1) create module folder, (2) implement `VenueAdapter`, (3) add fixtures under `fixtures/`, (4) register in the venues Nest module, (5) extend `StaticSeededMatcher` with `logicalMarketId` mappings. Written so a new teammate could execute it without asking follow-ups.
- `docs/DATA_MODEL.md` — final collection shapes, indexes, relationships, and rationale for any deviation from the §5 starting point.
- `docs/TESTING.md` — how to run unit tests, how to run e2e tests, how to add a test, fixture conventions, the canonical split test case (§6a) as a worked example.

**Docs rules:**
- No CLAUDE.md unless I explicitly ask.
- No "vision", "roadmap", or "future work" docs — they rot.
- No duplicating content across files; link between them.
- If a doc gets a question twice, answer it in the doc.
- Every doc ends with its "Last updated" date (absolute, not relative).

## 15. First response format (do this now)

When you receive this prompt:

1. Acknowledge the product thesis in your own words (≤3 sentences) so I can confirm alignment.
2. List the **top 5 ambiguities or decisions** you need from me before planning (e.g. how `logicalMarketId` gets assigned in Phase 1 given that venue IDs don't align and cross-venue linking ultimately requires AI-based title matching — see §5a; how to handle currency differences between USDC-settled Polymarket and USD-settled Kalshi; multi-outcome normalization; fee model for the routed quote; authentication posture for Phase 1).
3. Propose a one-page plan for Phase 1 — files/modules to create in dependency order, **with explicit slots at the end for §13 (verification gate) and §14 (documentation set)** — and stop. **Do not write implementation code until I approve the plan.**

---

*End of prompt. The body above is the instruction set — do not treat this footer as a task.*

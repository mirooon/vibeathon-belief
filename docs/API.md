# Belief API

> Swagger UI: `http://localhost:3000/api/v1/docs`
> OpenAPI JSON: `http://localhost:3000/api/v1/docs-json`

## Global conventions

- **Base URL:** `http://localhost:3000/api/v1`
- **Prices** are 0–1 decimal probabilities (e.g. `0.5142`), not percentages. Kalshi's native cents are converted at the adapter boundary.
- **Size** is in shares / contracts, not USD notional. USD cost of a fill = `size × avgPrice`.
- **Currency:** All venues are normalised to a single unit `"USD"`. Every market carries `quoteCurrency: "USD"`.
- **Rounding:** `blendedPrice` and `avgPrice` are rounded to **4 decimals**. `fees` and `totalFees` to **2 decimals** (cents). `estimatedSlippageBps` is an integer ≥ 0.
- **Auth:** none.
- **Error envelope** (shared across all 4xx/5xx responses):
  ```json
  {
    "error": {
      "code": "MARKET_NOT_FOUND",
      "message": "No logical market with id 'xyz'",
      "details": { "logicalId": "xyz" }
    }
  }
  ```
  - `code` is SCREAMING_SNAKE_CASE and stable across versions.
  - `message` is human-readable and may change.
  - `details` is optional, contextual, programmatic.
- **Stable error codes:** `MARKET_NOT_FOUND`, `OUTCOME_NOT_FOUND`, `MARKET_NOT_OPEN`, `INVALID_REQUEST`, `INTERNAL_ERROR`.

---

### GET /api/v1/health

**Summary.** Liveness/readiness probe used by the compose healthcheck.
**Auth.** None.
**Path params.** None.
**Query params.** None.
**Request body.** None.
**Response 200.**
```ts
{
  status: "ok",
  mongo: "up" | "down",
  uptimeSec: number   // Math.floor(process.uptime())
}
```
**Error responses.** None expected; the process returning 200 with `mongo: "down"` indicates the API is up but Mongo is unreachable.
**Example.**
```bash
curl http://localhost:3000/api/v1/health
# { "status": "ok", "mongo": "up", "uptimeSec": 137 }
```

---

### GET /api/v1/markets

**Summary.** List logical markets with aggregated best bid/ask per outcome.
**Auth.** None.
**Path params.** None.
**Query params.**
- `status` (`"open" | "closed" | "resolved"`, optional) — filter by market status.

**Request body.** None.
**Response 200.**
```ts
{
  items: Array<{
    id: string,                    // canonical logical market id
    title: string,
    category: string,
    endDate: string,               // ISO-8601
    status: "open" | "closed" | "resolved",
    quoteCurrency: "USD",
    venues: Array<"polymarket" | "kalshi" | "myriad">,
    outcomes: Array<{
      outcomeId: string,
      outcomeLabel: string,
      bestBid: number | null,      // highest bid across venues, 0–1, null if no depth
      bestAsk: number | null       // lowest ask across venues, 0–1, null if no depth
    }>
  }>,
  cursor: string | null
}
```
**Error responses.** None specific; 500 on upstream failure.
**Example request.**
```bash
curl 'http://localhost:3000/api/v1/markets?status=open'
```
**Notes.** Sort order is by `endDate` ascending. Markets are populated by the indexer worker; the list reflects the current live state from all venues.

---

### GET /api/v1/markets/:id

**Summary.** Full detail for one logical market — aggregated best prices, per-venue breakdown, per-outcome price history.
**Auth.** None.
**Path params.**
- `id` (string, required) — canonical logical market id.

**Query params.**
- `from` (ISO-8601, optional) — filter price history points with `timestamp >= from`.
- `to` (ISO-8601, optional) — filter price history points with `timestamp <= to`.

**Request body.** None.
**Response 200.**
```ts
{
  id: string,
  title: string,
  category: string,
  endDate: string,                  // ISO-8601
  status: "open" | "closed" | "resolved",
  quoteCurrency: "USD",
  outcomes: Array<{ id: string, label: string }>,
  aggregatedBestPrices: Array<{
    outcomeId: string,
    bestBid: number | null,
    bestAsk: number | null
  }>,
  venueBreakdown: Array<{
    venue: "polymarket" | "kalshi" | "myriad",
    sourceMarketId: string,
    outcomes: Array<{
      outcomeId: string,
      bestBid: number | null,
      bestAsk: number | null,
      bidDepth: number,             // total size on bid side across levels
      askDepth: number              // total size on ask side across levels
    }>
  }>,
  priceHistory: Array<{
    outcomeId: string,
    unified: Array<{ timestamp: string, price: number }>,
    perVenue: Array<{
      venue: "polymarket" | "kalshi" | "myriad",
      points: Array<{ timestamp: string, price: number }>
    }>
  }>
}
```
**Error responses.**
- `404 MARKET_NOT_FOUND` — `id` is unknown.
**Example request.**
```bash
curl 'http://localhost:3000/api/v1/markets/polymarket-abc123'
```
**Notes.** `aggregatedBestPrices.bestAsk` is the minimum ask across all venues with depth; `bestBid` is the maximum bid.

---

### POST /api/v1/markets/:id/quote

**Summary.** Multi-route quote: the `optimal` greedy-split route plus one `single:<venue>` route per venue with any depth.
**Auth.** None.
**Path params.**
- `id` (string, required) — canonical logical market id.

**Query params.** None.
**Request body.**
```ts
{
  outcomeId: string,                // canonical outcome id from market.outcomes[]
  side: "buy" | "sell",             // buy walks asks ascending; sell walks bids descending
  size: number                      // positive, in SHARES/CONTRACTS
}
```
**Response 200.**
```ts
{
  request: { logicalMarketId, outcomeId, side, size },
  routes: Array<{
    id: "optimal" | `single:${venue}`,
    label: string,                  // human-readable
    isOptimal: boolean,
    splits: Array<{
      venue: "polymarket" | "kalshi" | "myriad",
      size: number,                 // shares allocated to this venue
      avgPrice: number,             // weighted average fill price, 0–1, 4-decimal
      fees: number                  // USD, 2-decimal
    }>,
    filledSize: number,             // sum of splits[].size
    unfilledSize: number,           // request.size − filledSize, ≥ 0
    blendedPrice: number,           // weighted avg across all splits, 4-decimal
    totalFees: number,              // sum of splits[].fees
    estimatedSlippageBps: number    // integer ≥ 0
  }>
}
```
**Invariants:**
- `routes[0].id === "optimal"` and `routes[0].isOptimal === true`.
- Exactly one route has `isOptimal: true`.
- For every venue with depth for this `(outcomeId, side)`, there is one `single:<venue>` route — even if it cannot fully fill (`unfilledSize > 0`).
- `splits[]` is in **execution order** (best price first).

**Error responses.**
- `400 INVALID_REQUEST` — missing / malformed body (`size <= 0`, unknown `side`).
- `404 MARKET_NOT_FOUND` — `id` is unknown.
- `404 OUTCOME_NOT_FOUND` — `outcomeId` is not an outcome of this market.
- `409 MARKET_NOT_OPEN` — market `status` is `closed` or `resolved`.

**Worked example.**

Assume orderbook state for some market, outcome `france`, BUY side:

| Venue | Top-of-book ask | Depth |
|---|---|---|
| Polymarket | 0.51 | 500 |
| Kalshi | 0.535 | 400 |
| Myriad | 0.56 | 300 |

Request:
```bash
curl -X POST http://localhost:3000/api/v1/markets/<id>/quote \
  -H "Content-Type: application/json" \
  -d '{"outcomeId": "france", "side": "buy", "size": 600}'
```

Response (abridged):
```json
{
  "routes": [
    {
      "id": "optimal",
      "isOptimal": true,
      "splits": [
        { "venue": "polymarket", "size": 500, "avgPrice": 0.51, "fees": 0 },
        { "venue": "kalshi", "size": 100, "avgPrice": 0.535, "fees": 1.07 }
      ],
      "filledSize": 600, "unfilledSize": 0,
      "blendedPrice": 0.5142, "totalFees": 1.07
    },
    { "id": "single:polymarket", "filledSize": 500, "unfilledSize": 100, ... },
    { "id": "single:kalshi",     "filledSize": 400, "unfilledSize": 200, ... },
    { "id": "single:myriad",     "filledSize": 300, "unfilledSize": 300, ... }
  ]
}
```

Blended-price derivation: `(500 × 0.51 + 100 × 0.535) / 600 ≈ 0.5142`.

**Fees.** Per-venue static config:
- Polymarket: 0 bps
- Kalshi: 200 bps (2%)
- Myriad: 100 bps (1%)

Fee formula: `notional × takerBps / 10_000`, where `notional = size × avgPrice`.

---

### POST /api/v1/belief/search

**Summary.** Semantic search — find markets that match a natural-language belief statement.
**Auth.** None.
**Path params.** None.
**Query params.** None.
**Request body.**
```ts
{
  query: string    // plain-English belief, e.g. "France wins the 2026 World Cup"
}
```
**Response 200.**
```ts
{
  results: Array<{
    id: string,
    title: string,
    category: string,
    endDate: string,
    status: "open" | "closed" | "resolved",
    venues: Array<"polymarket" | "kalshi" | "myriad">,
    score: number    // cosine similarity, 0–1; higher = more relevant
  }>
}
```
**Example.**
```bash
curl -X POST http://localhost:3000/api/v1/belief/search \
  -H "Content-Type: application/json" \
  -d '{"query":"Fed cuts rates in June"}' | jq .
```
**Notes.** Embeddings are computed in-process via `@xenova/transformers` (no external API). The model downloads on first use. Results are ranked by cosine similarity; unrelated markets are excluded.

---

**Last updated:** 2026-04-22

# Adding a new venue

Onboarding a new prediction-market venue (e.g. Manifold, PredictIt) is a purely additive change. No core files are modified. The steps assume the venue name is `newvenue`.

## 1. Extend the Venue enum

In `shared/src/venue.ts`:

```ts
export const VenueSchema = z.enum(["polymarket", "kalshi", "myriad", "newvenue"]);
export const ALL_VENUES: readonly Venue[] = ["polymarket", "kalshi", "myriad", "newvenue"] as const;
```

Rebuild shared: `npm run build --workspace=shared`.

## 2. Write a venue API client

Create `worker/src/adapters/newvenue.client.ts`. It should export typed interfaces for the venue's raw API shapes and fetch functions that handle pagination. Follow the same pattern as the existing clients — fetch all pages, return typed arrays, throw on hard errors.

Normalise at the client boundary:
- Prices → **0–1 probabilities** (Kalshi's cents, AMM spot prices, etc. all convert here)
- Sizes → **shares/contracts** (not USD notional)

## 3. Write sync functions for the worker

In `worker/src/sync/`, add sync logic (either as new files or extend the existing ones). You need three functions analogous to `syncPolymarket()` / `syncKalshi()` / `syncMyriad()` inside each sync module:

- **market-sync** — fetch all open events/markets, upsert into `logical_markets`, `venue_markets`, `logical_events`, `venue_events`. Compose `sourceMarketId` as a stable string that the orderbook and price syncs can round-trip back to the venue's native identifier.
- **orderbook-sync** — fetch current L2 bids/asks per market. If the venue is AMM-based (no native order book), synthesise levels by sampling a quote endpoint at ascending notionals, as done for Myriad.
- **price-sync** — fetch price history points and upsert into `price_history`.

Register each new function in the `Promise.allSettled([...])` call inside `runMarketSync`, `runOrderbookSync`, and `runPriceSync`.

## 4. Add fee config

In `backend/src/config/venue-fees.ts`:

```ts
export const VENUE_FEES: Record<Venue, VenueFeeConfig> = {
  polymarket: { takerBps: 0 },
  kalshi:     { takerBps: 200 },
  myriad:     { takerBps: 100 },
  newvenue:   { takerBps: 150 },    // use the venue's published taker fee
};
```

## 5. Implement the `VenueAdapter` interface (backend)

Create `backend/src/venues/newvenue/newvenue.adapter.ts`:

```ts
@Injectable()
export class NewVenueAdapter implements VenueAdapter {
  readonly venue: Venue = "newvenue";

  async getMarket(id: string): Promise<VenueMarket | null> { /* reads from Mongo */ }
  async getOrderBook(id: string): Promise<VenueOrderBookSnapshot | null> { /* reads from Mongo */ }
  async getPriceHistory(
    sourceMarketId: string,
    sourceOutcomeId: string,
    range?: VenuePriceHistoryRange,
  ): Promise<PriceHistoryPoint[]> { /* reads from Mongo */ }
}
```

Register it in `backend/src/venues/venues.module.ts` alongside the existing adapters.

---

**Verify the integration:**

```bash
./scripts/start.sh --rebuild
```

The worker logs should show `[market-sync] newvenue: upserted N markets` on startup. Check that the new venue's markets appear in `GET /api/v1/markets` and that quote routes include `single:newvenue` for any market it covers.

---

**Last updated:** 2026-04-22

# Adding a new venue — 5 steps

Onboarding a new prediction-market venue (e.g. Manifold, PredictIt) is a purely additive change. **No core files are modified.** The steps assume the venue name is `newvenue`.

## 1. Extend the Venue enum

In `shared/src/venue.ts`:

```ts
export const VenueSchema = z.enum(["polymarket", "kalshi", "myriad", "newvenue"]);
export const ALL_VENUES: readonly Venue[] = ["polymarket", "kalshi", "myriad", "newvenue"] as const;
```

Rebuild shared: `npm run build --workspace=shared`.

## 2. Implement the `VenueAdapter` interface

Create `backend/src/venues/newvenue/newvenue.adapter.ts`:

```ts
@Injectable()
export class NewVenueAdapter implements VenueAdapter {
  readonly venue: Venue = "newvenue";

  async listMarkets(): Promise<VenueMarket[]> { /* ... */ }
  async getMarket(id: string): Promise<VenueMarket | null> { /* ... */ }
  async getOrderBook(id: string): Promise<VenueOrderBookSnapshot | null> { /* ... */ }
  async getPriceHistory(
    sourceMarketId: string,
    sourceOutcomeId: string,
    range?: VenuePriceHistoryRange,
  ): Promise<PriceHistoryPoint[]> { /* ... */ }
  async quoteOrder(req: VenueQuoteRequest): Promise<VenueQuoteResult> { /* ... */ }
}
```

Prices must be normalized to **0–1 probability** and sizes to **shares/contracts** before returning.

Convention: unknown ids return `null` without throwing. Any *actual* failure (fixture parse error, upstream API error) throws — the aggregator catches and omits the venue from that request's routes.

## 3. Add fixtures (Phase 1)

Under `backend/src/venues/newvenue/fixtures/`:

- `markets.ts` exports `NEWVENUE_MARKETS: VenueMarket[]`
- `order-books.ts` exports `NEWVENUE_ORDER_BOOKS: VenueOrderBookSnapshot[]`
- `price-history.ts` exports `NEWVENUE_PRICE_HISTORY: Record<"sourceMarketId:sourceOutcomeId", PriceHistoryPoint[]>`

Meet the §5b coverage bar: at least one outcome with ≥3 depth levels, realistic price progression, timestamps consistent with other venues' price-history so the unified chart aligns.

## 4. Register the adapter in `VenuesModule`

In `backend/src/venues/venues.module.ts`:

```ts
@Module({
  providers: [
    PolymarketAdapter,
    KalshiAdapter,
    MyriadAdapter,
    NewVenueAdapter,                                             // add
    {
      provide: VENUE_ADAPTERS,
      useFactory: (
        poly: PolymarketAdapter,
        kalshi: KalshiAdapter,
        myriad: MyriadAdapter,
        newvenue: NewVenueAdapter,                               // add
      ): VenueAdapter[] => [poly, kalshi, myriad, newvenue],
      inject: [PolymarketAdapter, KalshiAdapter, MyriadAdapter, NewVenueAdapter],
    },
  ],
  exports: [VENUE_ADAPTERS, /* ... */ NewVenueAdapter],
})
export class VenuesModule {}
```

Also add an entry in `backend/src/config/venue-fees.ts`:

```ts
export const VENUE_FEES: Record<Venue, VenueFeeConfig> = {
  polymarket: { takerBps: 0 },
  kalshi: { takerBps: 200 },
  myriad: { takerBps: 100 },
  newvenue: { takerBps: 150 },    // pick a realistic number
};
```

And register the adapter in the seed script's `adapters` map (`backend/src/seed/seed.ts`).

## 5. Extend `StaticSeededMatcher` with mappings (Phase 1)

In `backend/src/matching/static-seeded-matcher.ts`, add entries to `SEEDED_LOGICAL_MARKETS` pointing at your fixture markets:

```ts
{
  id: "existing-logical-market",
  outcomes: [...],
  venueMarkets: [
    /* existing refs */,
    {
      venue: "newvenue",
      sourceMarketId: "newvenue-foo",
      outcomeMap: { newvenue_outcome_1: "canonical_outcome_id", ... },
    },
  ],
}
```

For Kalshi-shaped venues (N binaries per multi-outcome event), add one `venueMarkets` entry per binary, each mapping the YES side to a single canonical outcome.

When the LLM matcher ships in Phase 2, this static file disappears — the new venue will be matched automatically from its titles.

---

**Verify the integration:**

```bash
./scripts/bootstrap.sh       # rebuild, seed, run e2e — must exit 0
```

Add at least one e2e assertion in `backend/test/e2e/api.e2e-spec.ts` covering a market that involves your new venue.

---

**Last updated:** 2026-04-21

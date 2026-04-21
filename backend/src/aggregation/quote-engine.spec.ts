import type { QuoteResponse, QuoteRoute, Venue } from "@vibeahack/shared";
import { VENUE_FEES, type VenueFeeConfig } from "../config/venue-fees.js";
import {
  buildBudgetQuote,
  buildQuote,
  type BuildBudgetQuoteInput,
  type BuildQuoteInput,
} from "./quote-engine.js";

const feeConfig: Record<Venue, VenueFeeConfig> = VENUE_FEES;

function mkInput(
  perVenueLevels: BuildQuoteInput["perVenueLevels"],
  size = 600,
  side: "buy" | "sell" = "buy",
): BuildQuoteInput {
  return {
    logicalMarketId: "fifa-2026-winner",
    request: { outcomeId: "france", side, size },
    perVenueLevels,
    feeConfig,
  };
}

function route(res: QuoteResponse, id: string): QuoteRoute {
  const r = res.routes.find((x) => x.id === id);
  if (!r) throw new Error(`expected route '${id}', got ${res.routes.map((x) => x.id).join(", ")}`);
  return r;
}

describe("buildQuote — §8 coverage", () => {
  // §6a canonical case.
  it("(c) splits across venues when the best venue lacks depth — $600/$500+$100", () => {
    const perVenueLevels: BuildQuoteInput["perVenueLevels"] = [
      { venue: "polymarket", levels: [{ price: 0.51, size: 500 }] },
      { venue: "kalshi", levels: [{ price: 0.535, size: 400 }] },
      { venue: "myriad", levels: [{ price: 0.56, size: 300 }] },
    ];

    const res = buildQuote(mkInput(perVenueLevels, 600));

    expect(res.request).toEqual({
      logicalMarketId: "fifa-2026-winner",
      outcomeId: "france",
      side: "buy",
      size: 600,
    });

    expect(res.routes.map((r) => r.id)).toEqual([
      "optimal",
      "single:polymarket",
      "single:kalshi",
      "single:myriad",
    ]);
    expect(res.routes.filter((r) => r.isOptimal).length).toBe(1);

    const optimal = route(res, "optimal");
    expect(optimal.isOptimal).toBe(true);
    expect(optimal.splits).toEqual([
      { venue: "polymarket", size: 500, avgPrice: 0.51, fees: 0 },
      { venue: "kalshi", size: 100, avgPrice: 0.535, fees: 1.07 },
    ]);
    expect(optimal.filledSize).toBe(600);
    expect(optimal.unfilledSize).toBe(0);
    expect(optimal.blendedPrice).toBeCloseTo(0.5142, 4);
    expect(optimal.totalFees).toBeCloseTo(1.07, 2);

    const singlePoly = route(res, "single:polymarket");
    expect(singlePoly.filledSize).toBe(500);
    expect(singlePoly.unfilledSize).toBe(100);
    expect(singlePoly.blendedPrice).toBeCloseTo(0.51, 4);
    expect(singlePoly.splits).toEqual([
      { venue: "polymarket", size: 500, avgPrice: 0.51, fees: 0 },
    ]);

    const singleKalshi = route(res, "single:kalshi");
    expect(singleKalshi.filledSize).toBe(400);
    expect(singleKalshi.unfilledSize).toBe(200);
    expect(singleKalshi.blendedPrice).toBeCloseTo(0.535, 4);
    expect(singleKalshi.splits).toEqual([
      { venue: "kalshi", size: 400, avgPrice: 0.535, fees: 4.28 },
    ]);

    const singleMyriad = route(res, "single:myriad");
    expect(singleMyriad.filledSize).toBe(300);
    expect(singleMyriad.unfilledSize).toBe(300);
    expect(singleMyriad.blendedPrice).toBeCloseTo(0.56, 4);
    expect(singleMyriad.splits).toEqual([
      { venue: "myriad", size: 300, avgPrice: 0.56, fees: 1.68 },
    ]);
  });

  it("(a) single-venue passthrough — only one venue has depth", () => {
    const perVenueLevels: BuildQuoteInput["perVenueLevels"] = [
      {
        venue: "polymarket",
        levels: [
          { price: 0.6, size: 200 },
          { price: 0.62, size: 200 },
          { price: 0.64, size: 200 },
        ],
      },
    ];

    const res = buildQuote(mkInput(perVenueLevels, 500));

    expect(res.routes.map((r) => r.id)).toEqual(["optimal", "single:polymarket"]);
    const optimal = route(res, "optimal");
    expect(optimal.filledSize).toBe(500);
    expect(optimal.unfilledSize).toBe(0);
    // (200*0.6 + 200*0.62 + 100*0.64) / 500 = 0.616
    expect(optimal.blendedPrice).toBeCloseTo(0.616, 4);
    expect(optimal.splits).toEqual([
      { venue: "polymarket", size: 500, avgPrice: 0.616, fees: 0 },
    ]);
  });

  it("(b) two-venue best-price selection when optimal equals one-venue route", () => {
    const perVenueLevels: BuildQuoteInput["perVenueLevels"] = [
      {
        venue: "polymarket",
        levels: [
          { price: 0.48, size: 500 },
          { price: 0.5, size: 300 },
        ],
      },
      {
        venue: "kalshi",
        levels: [
          { price: 0.49, size: 400 },
          { price: 0.51, size: 300 },
        ],
      },
    ];

    const res = buildQuote(mkInput(perVenueLevels, 500));

    expect(res.routes.map((r) => r.id)).toEqual([
      "optimal",
      "single:polymarket",
      "single:kalshi",
    ]);

    const optimal = route(res, "optimal");
    expect(optimal.splits).toEqual([
      { venue: "polymarket", size: 500, avgPrice: 0.48, fees: 0 },
    ]);
    expect(optimal.filledSize).toBe(500);
    expect(optimal.blendedPrice).toBeCloseTo(0.48, 4);

    // single:kalshi still appears even though it's not optimal.
    // Walks both Kalshi levels: 400@0.49 + 100@0.51 = 500 filled, avg 0.494, fees 4.94
    const singleKalshi = route(res, "single:kalshi");
    expect(singleKalshi.splits).toEqual([
      { venue: "kalshi", size: 500, avgPrice: 0.494, fees: 4.94 },
    ]);
    expect(singleKalshi.filledSize).toBe(500);
    expect(singleKalshi.unfilledSize).toBe(0);
    expect(singleKalshi.blendedPrice).toBeCloseTo(0.494, 4);
  });

  it("(d) degrades gracefully when a venue contributes zero levels (outage)", () => {
    // Caller represents an adapter-failure as an empty levels array.
    const perVenueLevels: BuildQuoteInput["perVenueLevels"] = [
      { venue: "polymarket", levels: [] },
      { venue: "kalshi", levels: [{ price: 0.5, size: 300 }] },
      { venue: "myriad", levels: [{ price: 0.52, size: 200 }] },
    ];

    const res = buildQuote(mkInput(perVenueLevels, 400));

    expect(res.routes.map((r) => r.id)).toEqual([
      "optimal",
      "single:kalshi",
      "single:myriad",
    ]);
    expect(res.routes.some((r) => r.id === "single:polymarket")).toBe(false);

    const optimal = route(res, "optimal");
    expect(optimal.splits).toEqual([
      { venue: "kalshi", size: 300, avgPrice: 0.5, fees: 3 },
      { venue: "myriad", size: 100, avgPrice: 0.52, fees: 0.52 },
    ]);
    expect(optimal.filledSize).toBe(400);
  });

  it("(e) fully-unfillable size — unfilledSize > 0 on every route", () => {
    const perVenueLevels: BuildQuoteInput["perVenueLevels"] = [
      { venue: "polymarket", levels: [{ price: 0.4, size: 50 }] },
      { venue: "kalshi", levels: [{ price: 0.42, size: 30 }] },
    ];

    const res = buildQuote(mkInput(perVenueLevels, 1_000));

    for (const r of res.routes) {
      expect(r.unfilledSize).toBeGreaterThan(0);
    }

    const optimal = route(res, "optimal");
    expect(optimal.filledSize).toBe(80);
    expect(optimal.unfilledSize).toBe(920);
    // (50*0.4 + 30*0.42)/80 = 0.4075
    expect(optimal.blendedPrice).toBeCloseTo(0.4075, 4);
  });

  it("emits exactly one optimal route even when all venues are empty", () => {
    const res = buildQuote(mkInput([], 100));

    expect(res.routes).toHaveLength(1);
    const optimal = route(res, "optimal");
    expect(optimal.filledSize).toBe(0);
    expect(optimal.unfilledSize).toBe(100);
    expect(optimal.blendedPrice).toBe(0);
    expect(optimal.splits).toEqual([]);
  });

  it("SELL walks bids descending (highest bid first)", () => {
    const perVenueLevels: BuildQuoteInput["perVenueLevels"] = [
      { venue: "polymarket", levels: [{ price: 0.49, size: 200 }] },
      { venue: "kalshi", levels: [{ price: 0.515, size: 300 }] },
    ];

    const res = buildQuote(mkInput(perVenueLevels, 400, "sell"));
    const optimal = route(res, "optimal");
    // Best SELL = highest bid → Kalshi 0.515 first.
    expect(optimal.splits).toEqual([
      { venue: "kalshi", size: 300, avgPrice: 0.515, fees: 3.09 },
      { venue: "polymarket", size: 100, avgPrice: 0.49, fees: 0 },
    ]);
    // (300*0.515 + 100*0.49)/400 = 0.5088 (rounded)
    expect(optimal.blendedPrice).toBeCloseTo(0.5088, 4);
  });
});

describe("buildBudgetQuote — USD-sized routing", () => {
  it("splits a $100 budget across the cheapest venues first", () => {
    const perVenueLevels: BuildBudgetQuoteInput["perVenueLevels"] = [
      { venue: "polymarket", levels: [{ price: 0.5, size: 100 }] },
      { venue: "kalshi", levels: [{ price: 0.6, size: 200 }] },
    ];

    const r = buildBudgetQuote({
      perVenueLevels,
      budgetUsd: 100,
      feeConfig,
    });

    // Polymarket: 100 shares × $0.50 = $50 (0 bps fees).
    // Remaining $50 goes to Kalshi: at $0.60 with 200 bps, cost per share =
    // 0.60 * 1.02 = 0.612 → 50 / 0.612 ≈ 81.6993 shares. Notional ≈ $49.02,
    // fees ≈ $0.98, total ≈ $50.
    expect(r.splits).toHaveLength(2);
    expect(r.splits[0]).toMatchObject({ venue: "polymarket", avgPrice: 0.5 });
    expect(r.splits[0]?.sizeShares).toBe(100);
    expect(r.splits[0]?.notionalUsd).toBe(50);
    expect(r.splits[0]?.fees).toBe(0);

    expect(r.splits[1]).toMatchObject({ venue: "kalshi", avgPrice: 0.6 });
    expect(r.splits[1]?.notionalUsd).toBeCloseTo(49.02, 2);
    expect(r.splits[1]?.fees).toBeCloseTo(0.98, 2);

    expect(r.totalCostUsd).toBeCloseTo(100, 2);
    expect(r.unfilledBudgetUsd).toBeCloseTo(0, 2);
    expect(r.filledNotionalUsd).toBeCloseTo(99.02, 2);
    expect(r.totalFeesUsd).toBeCloseTo(0.98, 2);
  });

  it("reports unfilled budget when cross-venue depth is insufficient", () => {
    const perVenueLevels: BuildBudgetQuoteInput["perVenueLevels"] = [
      { venue: "polymarket", levels: [{ price: 0.5, size: 50 }] },
    ];

    const r = buildBudgetQuote({
      perVenueLevels,
      budgetUsd: 100,
      feeConfig,
    });

    expect(r.splits).toEqual([
      {
        venue: "polymarket",
        sizeShares: 50,
        avgPrice: 0.5,
        notionalUsd: 25,
        fees: 0,
      },
    ]);
    expect(r.filledSizeShares).toBe(50);
    expect(r.totalCostUsd).toBe(25);
    expect(r.unfilledBudgetUsd).toBe(75);
  });

  it("accounts for per-venue taker fees when the whole budget fills on one venue", () => {
    // Kalshi only: 200 bps taker. cost/share = 0.50 * 1.02 = 0.51.
    // $100 / 0.51 ≈ 196.0784 shares. notional ≈ 98.04, fees ≈ 1.96, total ≈ 100.
    const perVenueLevels: BuildBudgetQuoteInput["perVenueLevels"] = [
      { venue: "kalshi", levels: [{ price: 0.5, size: 500 }] },
    ];

    const r = buildBudgetQuote({
      perVenueLevels,
      budgetUsd: 100,
      feeConfig,
    });

    expect(r.splits).toHaveLength(1);
    expect(r.splits[0]?.venue).toBe("kalshi");
    expect(r.splits[0]?.notionalUsd).toBeCloseTo(98.04, 2);
    expect(r.splits[0]?.fees).toBeCloseTo(1.96, 2);
    expect(r.totalCostUsd).toBeCloseTo(100, 2);
    expect(r.unfilledBudgetUsd).toBeCloseTo(0, 2);
  });

  it("returns an empty route when no venue has depth", () => {
    const r = buildBudgetQuote({
      perVenueLevels: [],
      budgetUsd: 100,
      feeConfig,
    });

    expect(r.splits).toEqual([]);
    expect(r.filledSizeShares).toBe(0);
    expect(r.totalCostUsd).toBe(0);
    expect(r.unfilledBudgetUsd).toBe(100);
    expect(r.blendedPrice).toBe(0);
  });
});

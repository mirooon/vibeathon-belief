import type { INestApplication } from "@nestjs/common";
import {
  ErrorEnvelopeSchema,
  HealthResponseSchema,
  MarketDetailSchema,
  MarketListResponseSchema,
  QuoteResponseSchema,
} from "@vibeahack/shared";
import request from "supertest";
import {
  createTestApp,
  deleteSnapshotByVenue,
  disconnectDefault,
  reseed,
  wipeDb,
} from "../helpers.js";

let app: INestApplication;
let http: request.Agent;

beforeAll(async () => {
  app = await createTestApp();
  http = request(app.getHttpServer());
});

afterAll(async () => {
  await app.close();
  await disconnectDefault();
});

describe("GET /api/v1/health", () => {
  it("returns 200 with { status: 'ok', mongo: 'up' }", async () => {
    const res = await http.get("/api/v1/health").expect(200);
    const body = HealthResponseSchema.parse(res.body);
    expect(body.status).toBe("ok");
    expect(body.mongo).toBe("up");
    expect(body.uptimeSec).toBeGreaterThanOrEqual(0);
  });
});

describe("GET /api/v1/markets — empty DB", () => {
  beforeAll(async () => {
    await wipeDb();
  });

  it("returns no items when nothing is seeded", async () => {
    const res = await http.get("/api/v1/markets").expect(200);
    const body = MarketListResponseSchema.parse(res.body);
    expect(body.items).toEqual([]);
    expect(body.cursor).toBeNull();
  });
});

describe("when DB is seeded", () => {
  beforeAll(async () => {
    await wipeDb();
    await reseed();
  });

  describe("GET /api/v1/markets", () => {
    it("returns all 4 logical markets", async () => {
      const res = await http.get("/api/v1/markets").expect(200);
      const body = MarketListResponseSchema.parse(res.body);
      expect(body.items.length).toBe(4);
      const ids = body.items.map((m) => m.id).sort();
      expect(ids).toEqual(
        [
          "btc-100k-2026",
          "fifa-2026-winner",
          "midterm-2026-dems-house",
          "superbowl-2026-chiefs",
        ].sort(),
      );
    });

    it("?status=open returns only open markets (3 of 4)", async () => {
      const res = await http.get("/api/v1/markets?status=open").expect(200);
      const body = MarketListResponseSchema.parse(res.body);
      expect(body.items.every((m) => m.status === "open")).toBe(true);
      expect(body.items.length).toBe(3);
    });

    it("?status=resolved returns only the resolved market", async () => {
      const res = await http.get("/api/v1/markets?status=resolved").expect(200);
      const body = MarketListResponseSchema.parse(res.body);
      expect(body.items.length).toBe(1);
      expect(body.items[0]?.id).toBe("superbowl-2026-chiefs");
    });

    it("tri-venue market lists all 3 venues", async () => {
      const res = await http.get("/api/v1/markets").expect(200);
      const body = MarketListResponseSchema.parse(res.body);
      const fifa = body.items.find((m) => m.id === "fifa-2026-winner");
      expect(fifa).toBeDefined();
      expect(fifa?.venues.sort()).toEqual(["kalshi", "myriad", "polymarket"]);
    });
  });

  describe("GET /api/v1/markets/:id", () => {
    it("tri-venue market lists Polymarket + Kalshi + Myriad in venueBreakdown", async () => {
      const res = await http
        .get("/api/v1/markets/fifa-2026-winner")
        .expect(200);
      const body = MarketDetailSchema.parse(res.body);

      const venuesInBreakdown = new Set(body.venueBreakdown.map((b) => b.venue));
      expect(venuesInBreakdown.has("polymarket")).toBe(true);
      expect(venuesInBreakdown.has("kalshi")).toBe(true);
      expect(venuesInBreakdown.has("myriad")).toBe(true);

      // France aggregated best ask is min across venues: Poly 0.51 < Kalshi 0.535 < Myriad 0.56
      const france = body.aggregatedBestPrices.find(
        (p) => p.outcomeId === "france",
      );
      expect(france?.bestAsk).toBeCloseTo(0.51, 4);

      // Unified price history is present for every outcome.
      for (const outcome of body.outcomes) {
        const ph = body.priceHistory.find((p) => p.outcomeId === outcome.id);
        expect(ph).toBeDefined();
        expect(ph!.unified.length).toBeGreaterThan(0);
      }
    });

    it("single-venue market (BTC) lists only Polymarket", async () => {
      const res = await http.get("/api/v1/markets/btc-100k-2026").expect(200);
      const body = MarketDetailSchema.parse(res.body);
      const venues = body.venueBreakdown.map((b) => b.venue);
      expect(venues).toEqual(["polymarket"]);
    });

    it("unknown id returns 404 with MARKET_NOT_FOUND", async () => {
      const res = await http.get("/api/v1/markets/does-not-exist").expect(404);
      const body = ErrorEnvelopeSchema.parse(res.body);
      expect(body.error.code).toBe("MARKET_NOT_FOUND");
      expect(body.error.details?.logicalId).toBe("does-not-exist");
    });

    it("resolved market surfaces status=resolved in the detail response", async () => {
      const res = await http
        .get("/api/v1/markets/superbowl-2026-chiefs")
        .expect(200);
      const body = MarketDetailSchema.parse(res.body);
      expect(body.status).toBe("resolved");
    });

    it("from/to filter narrows the price history window", async () => {
      const res = await http
        .get(
          "/api/v1/markets/fifa-2026-winner?from=2026-04-01T00:00:00.000Z&to=2026-04-21T23:59:59.999Z",
        )
        .expect(200);
      const body = MarketDetailSchema.parse(res.body);
      const france = body.priceHistory.find((p) => p.outcomeId === "france");
      // Fixtures have 6 weekly points starting 2026-03-17; 3 fall in the window.
      expect(france?.unified.length).toBeLessThan(6);
      expect(france?.unified.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/v1/markets/:id/quote — validation + errors", () => {
    it("missing outcomeId returns 400 INVALID_REQUEST", async () => {
      const res = await http
        .post("/api/v1/markets/fifa-2026-winner/quote")
        .send({ side: "buy", size: 100 })
        .expect(400);
      const body = ErrorEnvelopeSchema.parse(res.body);
      expect(body.error.code).toBe("INVALID_REQUEST");
    });

    it("negative size returns 400 INVALID_REQUEST", async () => {
      const res = await http
        .post("/api/v1/markets/fifa-2026-winner/quote")
        .send({ outcomeId: "france", side: "buy", size: -10 })
        .expect(400);
      const body = ErrorEnvelopeSchema.parse(res.body);
      expect(body.error.code).toBe("INVALID_REQUEST");
    });

    it("unknown outcome returns 404 OUTCOME_NOT_FOUND", async () => {
      const res = await http
        .post("/api/v1/markets/fifa-2026-winner/quote")
        .send({ outcomeId: "mars", side: "buy", size: 10 })
        .expect(404);
      const body = ErrorEnvelopeSchema.parse(res.body);
      expect(body.error.code).toBe("OUTCOME_NOT_FOUND");
    });

    it("unknown market returns 404 MARKET_NOT_FOUND", async () => {
      const res = await http
        .post("/api/v1/markets/does-not-exist/quote")
        .send({ outcomeId: "x", side: "buy", size: 1 })
        .expect(404);
      const body = ErrorEnvelopeSchema.parse(res.body);
      expect(body.error.code).toBe("MARKET_NOT_FOUND");
    });

    it("resolved market returns 409 MARKET_NOT_OPEN", async () => {
      const res = await http
        .post("/api/v1/markets/superbowl-2026-chiefs/quote")
        .send({ outcomeId: "yes", side: "buy", size: 1 })
        .expect(409);
      const body = ErrorEnvelopeSchema.parse(res.body);
      expect(body.error.code).toBe("MARKET_NOT_OPEN");
    });
  });

  describe("POST /api/v1/markets/:id/quote — canonical §6a case", () => {
    it("BUY 600 france splits 500 Poly + 100 Kalshi, blended 0.5142", async () => {
      const res = await http
        .post("/api/v1/markets/fifa-2026-winner/quote")
        .send({ outcomeId: "france", side: "buy", size: 600 })
        .expect(200);

      const body = QuoteResponseSchema.parse(res.body);
      expect(body.request).toEqual({
        logicalMarketId: "fifa-2026-winner",
        outcomeId: "france",
        side: "buy",
        size: 600,
      });
      expect(body.routes.map((r) => r.id)).toEqual([
        "optimal",
        "single:polymarket",
        "single:kalshi",
        "single:myriad",
      ]);
      expect(body.routes[0]!.isOptimal).toBe(true);
      expect(body.routes.filter((r) => r.isOptimal).length).toBe(1);

      const optimal = body.routes[0]!;
      expect(optimal.splits).toEqual([
        { venue: "polymarket", size: 500, avgPrice: 0.51, fees: 0 },
        { venue: "kalshi", size: 100, avgPrice: 0.535, fees: 1.07 },
      ]);
      expect(optimal.filledSize).toBe(600);
      expect(optimal.unfilledSize).toBe(0);
      expect(optimal.blendedPrice).toBeCloseTo(0.5142, 4);

      const singlePoly = body.routes.find((r) => r.id === "single:polymarket")!;
      expect(singlePoly.filledSize).toBe(500);
      expect(singlePoly.unfilledSize).toBe(100);

      const singleKalshi = body.routes.find((r) => r.id === "single:kalshi")!;
      expect(singleKalshi.filledSize).toBe(400);
      expect(singleKalshi.unfilledSize).toBe(200);

      const singleMyriad = body.routes.find((r) => r.id === "single:myriad")!;
      expect(singleMyriad.filledSize).toBe(300);
      expect(singleMyriad.unfilledSize).toBe(300);
    });
  });

  describe("POST /api/v1/markets/:id/quote — single-venue market", () => {
    it("BTC market (Polymarket only) returns optimal + single:polymarket and no other single:* routes", async () => {
      const res = await http
        .post("/api/v1/markets/btc-100k-2026/quote")
        .send({ outcomeId: "yes", side: "buy", size: 500 })
        .expect(200);

      const body = QuoteResponseSchema.parse(res.body);
      expect(body.routes.map((r) => r.id)).toEqual([
        "optimal",
        "single:polymarket",
      ]);
    });
  });

  describe("POST /api/v1/markets/:id/quote — venue outage resilience", () => {
    it("deleting Kalshi's snapshot still returns 200 with remaining venues", async () => {
      // Simulate venue outage: remove all Kalshi snapshots for fifa-fra.
      await deleteSnapshotByVenue("kalshi", "kalshi-fifa-fra");

      const res = await http
        .post("/api/v1/markets/fifa-2026-winner/quote")
        .send({ outcomeId: "france", side: "buy", size: 600 })
        .expect(200);

      const body = QuoteResponseSchema.parse(res.body);
      expect(body.routes.find((r) => r.id === "single:kalshi")).toBeUndefined();
      expect(body.routes.find((r) => r.id === "single:polymarket")).toBeDefined();
      expect(body.routes.find((r) => r.id === "single:myriad")).toBeDefined();

      // Re-seed for subsequent tests.
      await reseed();
    });
  });
});

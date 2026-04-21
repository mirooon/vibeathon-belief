/**
 * Pre-defined concept vectors for each logical market.
 * Keys match the logicalMarketId values in SEEDED_LOGICAL_MARKETS.
 *
 * These are hand-authored and normalized at query time.
 * In Phase 2, replace with model-generated embeddings stored in MongoDB.
 */
export const MARKET_CONCEPT_TEXTS: Record<string, string> = {
  "fifa-2026-winner":
    "FIFA World Cup 2026 winner soccer football Argentina France Brazil tournament champion",
  "midterm-2026-dems-house":
    "US midterm elections 2026 Democrats Republicans House Congress vote ballot",
  "btc-100k-2026":
    "Bitcoin BTC cryptocurrency price 100k 200k crypto blockchain bull market",
  "superbowl-2026-chiefs":
    "Super Bowl 2026 NFL Kansas City Chiefs football American sports",
  "oil-price-2026":
    "Brent crude oil price energy OPEC barrel Iran geopolitics sanctions Middle East",
  "fed-rate-cut-q2-2026":
    "Federal Reserve interest rate cut Fed FOMC inflation CPI monetary policy economy",
  "trump-tariff-eu-2026":
    "Trump tariffs EU Europe trade war executive order import duties 25 percent",
};

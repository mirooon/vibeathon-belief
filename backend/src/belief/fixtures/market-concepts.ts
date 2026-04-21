/**
 * Pre-defined concept vectors for each logical market.
 * Keys match the logicalMarketId values in SEEDED_LOGICAL_MARKETS.
 *
 * These are hand-authored and normalized at query time.
 * In Phase 2, replace with model-generated embeddings stored in MongoDB.
 */
export const MARKET_CONCEPT_TEXTS: Record<string, string> = {
  "fifa-2026-arg":
    "FIFA World Cup 2026 Argentina soccer football national team tournament champion",
  "fifa-2026-fra":
    "FIFA World Cup 2026 France soccer football national team tournament champion",
  "fifa-2026-bra":
    "FIFA World Cup 2026 Brazil soccer football Selecao national team tournament champion",
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

/**
 * Per-outcome concept text used by /belief/route to pick which side of a
 * market a belief aligns with. Keys: logicalMarketId → canonicalOutcomeId → text.
 *
 * Markets not listed here fall back to `${MARKET_CONCEPT_TEXTS[id]} ${outcomeLabel}`,
 * which is adequate for multi-outcome markets whose outcome labels are
 * distinguishing (e.g. team names) but uninformative for binary yes/no where
 * polarity keywords matter.
 */
export const OUTCOME_CONCEPT_TEXTS: Record<string, Record<string, string>> = {
  "fifa-2026-arg": {
    yes: "Argentina wins FIFA World Cup 2026, Messi Argentina national team soccer champion",
    no: "Argentina does not win FIFA World Cup 2026, knocked out eliminated",
  },
  "fifa-2026-fra": {
    yes: "France wins FIFA World Cup 2026, Mbappe French national team les bleus champion",
    no: "France does not win FIFA World Cup 2026, knocked out eliminated",
  },
  "fifa-2026-bra": {
    yes: "Brazil wins FIFA World Cup 2026, Selecao Brazilian national team yellow jersey champion",
    no: "Brazil does not win FIFA World Cup 2026, knocked out eliminated",
  },
  "midterm-2026-dems-house": {
    yes: "Democrats retain House majority 2026 midterms keep control Congress blue wave",
    no: "Republicans flip House take majority 2026 midterms red wave GOP wins Congress",
  },
  "btc-100k-2026": {
    yes: "Bitcoin BTC above 100000 hundred thousand rally bull market pump end of 2026",
    no: "Bitcoin BTC below 100000 crash bear market stagnate sideways end of 2026",
  },
  "oil-price-2026": {
    yes: "Brent crude oil above 100 per barrel supply shock Middle East tension OPEC cuts spike",
    no: "Brent crude oil below 100 per barrel weak demand recession supply glut prices fall",
  },
  "fed-rate-cut-q2-2026": {
    yes: "Fed cuts interest rates Q2 2026 dovish FOMC pivot easing cycle lower",
    no: "Fed holds rates unchanged Q2 2026 hawkish pause no cut sticky inflation higher for longer",
  },
  "trump-tariff-eu-2026": {
    yes: "Trump imposes 25 percent tariffs on EU goods trade war executive order 2026",
    no: "Trump backs down no EU tariffs negotiation deal averted trade war 2026",
  },
};

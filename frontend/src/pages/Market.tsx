import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMarket } from "../api/hooks.js";
import { PriceChart } from "../components/PriceChart.js";
import { QuoteModule } from "../components/QuoteModule.js";
import { VenueBreakdownPane } from "../components/VenueBreakdown.js";

export function Market() {
  const { id } = useParams<{ id: string }>();
  const { data: market, isLoading, error } = useMarket(id);
  const [chartOutcomeId, setChartOutcomeId] = useState<string | null>(null);

  if (isLoading) return <div className="loading">Loading market…</div>;
  if (error) return <div className="error">Failed to load market: {String(error)}</div>;
  if (!market) return <div className="error">No market data.</div>;

  const selectedChartOutcomeId = chartOutcomeId ?? market.outcomes[0]?.id ?? "";
  const firstOutcomeId = market.outcomes[0]?.id;
  const bestYes = market.aggregatedBestPrices.find((p) => p.outcomeId === firstOutcomeId)?.bestAsk ?? null;

  return (
    <>
      <div className="market-header">
        <Link to="/" className="back-link">
          <span>←</span> Back to markets
        </Link>

        <div className="market-header-inner">
          <div className="market-header-title">
            <span className="eyebrow">
              {market.category?.toLowerCase().replace(/\s+/g, "_")}
            </span>
            <h1 className="market-title-text">{market.title}</h1>
            <div className="market-meta-row">
              <span className={`badge ${market.status === "open" ? "success" : "warning"}`}>
                {market.status}
              </span>
              {market.status === "open" && (
                <span className="meta-text">
                  <span className="live-dot" /> Live
                </span>
              )}
              <span className="meta-dot" />
              <span className="meta-text">
                {market.venueBreakdown?.length ?? 0} venues aggregated
              </span>
              <span className="meta-dot" />
              <span className="meta-text" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                resolves {new Date(market.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {bestYes !== null && (
            <div className="market-header-price">
              <span className="eyebrow">best_aggregated_yes</span>
              <span className="market-price-value">
                ${bestYes.toFixed(2)}
              </span>
              <span style={{ color: "var(--fg-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                best ask across venues
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <div>
          <PriceChart
            histories={market.priceHistory}
            outcomes={market.outcomes}
            selectedOutcomeId={selectedChartOutcomeId}
            onSelectOutcome={setChartOutcomeId}
          />
          <VenueBreakdownPane
            breakdown={market.venueBreakdown}
            outcomes={market.outcomes}
          />
        </div>
        <div>
          {market.status === "open" ? (
            <QuoteModule
              logicalMarketId={market.id}
              outcomes={market.outcomes}
            />
          ) : (
            <div className="panel">
              <div className="panel-title">quote_and_route</div>
              <div className="loading">
                This market is <strong>{market.status}</strong>. Quotes are disabled.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

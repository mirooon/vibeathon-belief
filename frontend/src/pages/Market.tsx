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

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link to="/" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          ← back to markets
        </Link>
      </div>
      <div className="panel">
        <h2>{market.title}</h2>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          <span className={`badge ${market.status === "open" ? "success" : "warning"}`}>
            {market.status}
          </span>{" "}
          {market.category} · resolves{" "}
          {new Date(market.endDate).toLocaleDateString()} · id{" "}
          <code>{market.id}</code>
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
              <h2>Quote & route</h2>
              <div className="loading">
                This market is <strong>{market.status}</strong>. Quotes are
                disabled.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

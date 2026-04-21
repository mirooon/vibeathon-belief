import type { OrderSide, QuoteRoute } from "@vibeahack/shared";
import { useState } from "react";
import { useQuote } from "../api/hooks.js";

interface Props {
  logicalMarketId: string;
  outcomes: Array<{ id: string; label: string }>;
}

function formatSplitsSummary(route: QuoteRoute): string {
  if (route.splits.length === 0) return "No depth";
  return route.splits
    .map((s) => `${s.size} @ ${s.venue} ($${s.avgPrice.toFixed(3)})`)
    .join(" + ");
}

export function QuoteModule({ logicalMarketId, outcomes }: Props) {
  const initialOutcomeId = outcomes[0]?.id ?? "";
  const [outcomeId, setOutcomeId] = useState(initialOutcomeId);
  const [side, setSide] = useState<OrderSide>("buy");
  const [size, setSize] = useState(600);
  // Selection reset when request parameters change; a null user-choice falls back to the optimal route.
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [lastRequestKey, setLastRequestKey] = useState("");

  const req =
    outcomeId && size > 0 ? { outcomeId, side, size } : null;
  const { data: quote, isLoading, error } = useQuote(logicalMarketId, req);

  const requestKey = `${outcomeId}|${side}|${size}`;
  if (requestKey !== lastRequestKey) {
    setLastRequestKey(requestKey);
    setUserChoice(null);
  }

  const optimalId = quote?.routes.find((r) => r.isOptimal)?.id ?? null;
  const selectedRouteId = userChoice ?? optimalId;
  const selected = quote?.routes.find((r) => r.id === selectedRouteId);

  return (
    <div className="panel">
      <h2>Quote & route</h2>

      <div className="quote-form">
        <div>
          <label htmlFor="qm-outcome">Outcome</label>
          <select
            id="qm-outcome"
            value={outcomeId}
            onChange={(e) => setOutcomeId(e.target.value)}
          >
            {outcomes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <div>
            <label htmlFor="qm-side">Side</label>
            <select
              id="qm-side"
              value={side}
              onChange={(e) => setSide(e.target.value as OrderSide)}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label htmlFor="qm-size">Size (shares)</label>
            <input
              id="qm-size"
              type="number"
              min={1}
              step={10}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {isLoading && <div className="loading">Requesting quote…</div>}
      {error && <div className="error">Quote failed: {String(error)}</div>}

      {quote && (
        <>
          <div style={{ marginBottom: 8, color: "var(--text-dim)", fontSize: 12 }}>
            {quote.routes.length} route{quote.routes.length === 1 ? "" : "s"} — optimal pre-selected
          </div>
          {quote.routes.map((route) => (
            <div
              key={route.id}
              className={`route-card ${route.id === selectedRouteId ? "selected" : ""}`}
              onClick={() => setUserChoice(route.id)}
            >
              <div className="row">
                <span className="label">
                  {route.label}
                  {route.isOptimal && (
                    <span className="badge accent" style={{ marginLeft: 8 }}>
                      Best
                    </span>
                  )}
                </span>
                <span className="summary">
                  blended <strong>${route.blendedPrice.toFixed(4)}</strong>
                </span>
              </div>
              <div className="summary">{formatSplitsSummary(route)}</div>
              <div className="metrics">
                <span>
                  filled <strong>{route.filledSize}</strong>
                </span>
                {route.unfilledSize > 0 && (
                  <span>
                    unfilled <strong style={{ color: "var(--warning)" }}>{route.unfilledSize}</strong>
                  </span>
                )}
                <span>
                  fees <strong>${route.totalFees.toFixed(2)}</strong>
                </span>
                <span>
                  slippage <strong>{route.estimatedSlippageBps} bps</strong>
                </span>
              </div>
            </div>
          ))}
          {selected && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                background: "var(--panel-soft)",
                border: "1px solid var(--border)",
                borderRadius: 6,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
                Selected preview
              </div>
              <div>
                You will {side} <strong>{selected.filledSize}</strong> shares at blended{" "}
                <strong>${selected.blendedPrice.toFixed(4)}</strong>, paying{" "}
                <strong>${selected.totalFees.toFixed(2)}</strong> in fees
                {selected.unfilledSize > 0 && (
                  <>
                    {" "}(
                    <strong style={{ color: "var(--warning)" }}>
                      {selected.unfilledSize} unfilled
                    </strong>
                    )
                  </>
                )}
                .
              </div>
            </div>
          )}
          <button
            className="execute-btn"
            disabled
            title="Phase 1: order execution is not wired up"
          >
            Execute (disabled in Phase 1)
          </button>
        </>
      )}
    </div>
  );
}

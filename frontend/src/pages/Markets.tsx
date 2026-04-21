import type { MarketStatus } from "@vibeahack/shared";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useMarkets } from "../api/hooks.js";

const STATUS_FILTERS: Array<{ label: string; value: MarketStatus | undefined }> = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
];

function formatPrice(p: number | null): string {
  if (p === null) return "—";
  return p.toFixed(2);
}

export function Markets() {
  const [status, setStatus] = useState<MarketStatus | undefined>("open");
  const filter: { status?: MarketStatus } = {};
  if (status) filter.status = status;
  const { data, isLoading, error } = useMarkets(filter);

  return (
    <>
      <div className="panel">
        <h2>Markets</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={status === f.value ? "badge accent" : "badge"}
              style={{ cursor: "pointer", border: "1px solid var(--border)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isLoading && <div className="loading">Loading markets…</div>}
        {error && <div className="error">Failed to load: {String(error)}</div>}
        {data && data.items.length === 0 && (
          <div className="loading">No markets match this filter.</div>
        )}
        {data &&
          data.items.map((m) => (
            <Link
              to={`/markets/${encodeURIComponent(m.id)}`}
              key={m.id}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <div className="market-card">
                <h3>{m.title}</h3>
                <div className="meta">
                  <span className={`badge ${m.status === "open" ? "success" : "warning"}`}>
                    {m.status}
                  </span>{" "}
                  <span className="badge">{m.category}</span>{" "}
                  <span className="venues">
                    {m.venues.map((v) => (
                      <span key={v} className="badge">
                        {v}
                      </span>
                    ))}
                  </span>
                  <span style={{ color: "var(--text-dim)" }}>
                    resolves {new Date(m.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  {m.outcomes.map((o) => (
                    <div className="outcome-row" key={o.outcomeId}>
                      <div>{o.outcomeLabel}</div>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>bid</span>{" "}
                        <strong>{formatPrice(o.bestBid)}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-dim)" }}>ask</span>{" "}
                        <strong>{formatPrice(o.bestAsk)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          ))}
      </div>
    </>
  );
}

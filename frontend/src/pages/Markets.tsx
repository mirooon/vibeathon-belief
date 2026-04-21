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
      <div style={{ marginBottom: "var(--s-6)" }}>
        <span className="eyebrow" style={{ marginBottom: "var(--s-4)", display: "block" }}>markets</span>
        <div style={{ display: "flex", gap: 6, marginBottom: "var(--s-5)" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={`filter-btn ${status === f.value ? "active" : ""}`}
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
              style={{ color: "inherit", textDecoration: "none", display: "block" }}
            >
              <div className="market-card">
                <h3>{m.title}</h3>
                <div className="meta">
                  <span className={`badge ${m.status === "open" ? "success" : "warning"}`}>
                    {m.status}
                  </span>
                  <span className="badge">{m.category}</span>
                  <span className="venues">
                    {m.venues.map((v) => (
                      <span key={v} className="badge">{v}</span>
                    ))}
                  </span>
                  <span className="meta-dot" />
                  <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    resolves {new Date(m.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  {m.outcomes.map((o) => (
                    <div className="outcome-row" key={o.outcomeId}>
                      <div style={{ color: "var(--fg-1)", fontWeight: 500 }}>{o.outcomeLabel}</div>
                      <div>
                        <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>bid </span>
                        <strong style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
                          {formatPrice(o.bestBid)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 11 }}>ask </span>
                        <strong style={{ fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}>
                          {formatPrice(o.bestAsk)}
                        </strong>
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

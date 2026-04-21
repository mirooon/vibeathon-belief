import type { Venue } from "@vibeahack/shared";
import { Link, useParams } from "react-router-dom";
import { useEvent } from "../api/hooks.js";

const VENUE_LABELS: Record<Venue, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  myriad: "Myriad",
};

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function formatCents(p: number | null): string {
  if (p === null) return "—";
  return `${Math.round(p * 100)}¢`;
}

function formatPct(p: number | null): string {
  if (p === null) return "—";
  return `${Math.round(p * 100)}%`;
}

export function Event() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useEvent(id);

  if (isLoading) return <div className="loading">Loading event…</div>;
  if (error) return <div className="error">Failed to load: {String(error)}</div>;
  if (!data) return <div className="error">Event not found.</div>;

  return (
    <div className="pm-panel">
      <div className="pm-header-row">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {data.image && (
            <img
              src={data.image}
              alt=""
              style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }}
            />
          )}
          <div>
            <h1 className="pm-title-lg">{data.title}</h1>
            <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
              <span>{data.category}</span>
              <span>·</span>
              <span>{data.outcomes.length} outcomes</span>
              <span>·</span>
              <span>{formatUsd(data.volume24h)} 24h vol</span>
              <span>·</span>
              <span>closes {new Date(data.endDate).toLocaleDateString()}</span>
              <span>·</span>
              <span>
                {data.venues.map((v) => (
                  <span key={v} className="badge" style={{ marginRight: 4 }}>{VENUE_LABELS[v]}</span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {data.description && (
        <p style={{ color: "var(--fg-2)", marginTop: 4, marginBottom: 20 }}>
          {data.description}
        </p>
      )}

      <div className="pm-panel" style={{ marginTop: 16, padding: 0 }}>
        <table className="pm-event-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", textAlign: "left" }}>
              <th style={{ padding: "12px 16px" }}>Outcome</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Probability</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Buy Yes</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Buy No</th>
              <th style={{ padding: "12px 16px" }}>Venue</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.outcomes.map((o) => {
              const noPrice = o.bestAsk === null ? null : 1 - o.bestAsk;
              const disabled = o.bestAsk === null;
              return (
                <tr key={o.childMarketId} style={{ borderTop: "1px solid var(--ink-300)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{o.label}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    <span className={disabled ? "muted" : ""}>{formatPct(o.bestAsk)}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      className="pm-buy-btn pm-buy-yes"
                      disabled={disabled}
                    >
                      <span>Yes</span>
                      <span className="cents">{formatCents(o.bestAsk)}</span>
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      className="pm-buy-btn pm-buy-no"
                      disabled={disabled}
                    >
                      <span>No</span>
                      <span className="cents">{formatCents(noPrice)}</span>
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span className="badge">{VENUE_LABELS[o.venue]}</span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link
                      to={`/markets/${encodeURIComponent(o.childMarketId)}`}
                      className="pm-pill-btn"
                      style={{ textDecoration: "none" }}
                    >
                      Trade →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

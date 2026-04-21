import type { VenueBreakdown as VenueBreakdownType } from "@vibeahack/shared";
import { useState } from "react";

const VENUE_META: Record<string, { color: string; dot: string }> = {
  polymarket: { color: "#1E88FF", dot: "#1E88FF" },
  kalshi:     { color: "#4BD8B0", dot: "#4BD8B0" },
  myriad:     { color: "#B4B4BD", dot: "#B4B4BD" },
};

interface Props {
  breakdown: VenueBreakdownType[];
  outcomes: Array<{ id: string; label: string }>;
}

function fmt(p: number | null, decimals = 3): string {
  return p === null ? "—" : `$${p.toFixed(decimals)}`;
}

function DepthBar({ size, max }: { size: number; max: number }) {
  const pct = Math.min(100, max > 0 ? (size / max) * 100 : 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 12,
        color: "var(--fg-2)", fontVariantNumeric: "tabular-nums", width: 52, textAlign: "right",
      }}>
        {size.toLocaleString()}
      </span>
      <div style={{
        flex: 1, height: 4, background: "var(--ink-200)", borderRadius: 2, overflow: "hidden",
        maxWidth: 120,
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: "linear-gradient(90deg, rgba(248,113,113,0.6), rgba(248,113,113,0.2))",
        }} />
      </div>
    </div>
  );
}

function VenueRow({
  vb, outcomes, expanded, onToggle,
}: {
  vb: VenueBreakdownType;
  outcomes: Array<{ id: string; label: string }>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const meta = VENUE_META[vb.venue] ?? { color: "var(--fg-3)", dot: "var(--fg-3)" };
  const maxDepth = Math.max(1, ...vb.outcomes.flatMap((o) => [o.bidDepth, o.askDepth]));

  return (
    <div style={{
      background: expanded ? "rgba(255,255,255,0.015)" : "transparent",
      border: "1px solid var(--ink-200)", borderRadius: 12,
      transition: "background var(--dur-fast) var(--ease-standard)",
    }}>
      {/* Collapsed header row */}
      <div
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(140px,1fr) 1fr 1fr 80px 40px",
          gap: 12, padding: "14px 16px", alignItems: "center", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%", background: meta.dot, flexShrink: 0,
            boxShadow: `0 0 12px ${meta.dot}44`,
          }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-1)" }}>{vb.venue}</span>
          <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {vb.sourceMarketId}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {vb.outcomes.length} outcome{vb.outcomes.length !== 1 ? "s" : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%", background: "var(--success)",
          }} />
          <span style={{
            fontSize: 11, color: "var(--success)",
            background: "rgba(52,211,153,.08)", border: "1px solid rgba(52,211,153,.2)",
            padding: "2px 8px", borderRadius: 999, fontWeight: 500,
          }}>
            Active
          </span>
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)",
          textAlign: "right",
        }}>
          {vb.outcomes.reduce((s, o) => s + o.askDepth, 0).toLocaleString()} depth
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            background: "transparent", border: "1px solid var(--ink-300)", borderRadius: 8,
            color: "var(--fg-3)", width: 28, height: 28, cursor: "pointer",
            fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center",
            justifySelf: "end",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform var(--dur-base) var(--ease-standard)",
          }}
        >
          ▾
        </button>
      </div>

      {/* Expanded outcome table */}
      {expanded && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px dashed var(--ink-200)" }}>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
            gap: 12, padding: "10px 12px",
            fontSize: 10, color: "var(--fg-muted)", fontFamily: "var(--font-mono)",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            <span>outcome</span>
            <span>best_bid</span>
            <span>best_ask</span>
            <span>bid_depth</span>
            <span>ask_depth</span>
          </div>

          {vb.outcomes.map((o, i) => {
            const label = outcomes.find((c) => c.id === o.outcomeId)?.label ?? o.outcomeId;
            return (
              <div key={o.outcomeId} style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
                gap: 12, padding: "10px 12px", borderRadius: 8, alignItems: "center",
                background: i === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-1)" }}>{label}</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500,
                  color: "var(--success)", fontVariantNumeric: "tabular-nums",
                }}>
                  {fmt(o.bestBid)}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500,
                  color: "var(--danger)", fontVariantNumeric: "tabular-nums",
                }}>
                  {fmt(o.bestAsk)}
                </span>
                <DepthBar size={o.bidDepth} max={maxDepth} />
                <DepthBar size={o.askDepth} max={maxDepth} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VenueBreakdownPane({ breakdown, outcomes }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    breakdown.forEach((vb) => { init[`${vb.venue}:${vb.sourceMarketId}`] = true; });
    return init;
  });

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <section style={{
      background: "var(--bg-section)",
      border: "1px solid var(--ink-200)",
      borderRadius: 24, padding: "20px 22px 22px",
      display: "flex", flexDirection: "column", gap: 14,
      marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="eyebrow">per_venue_breakdown</span>
          <h3 style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--fg-1)" }}>
            Verify the routing math
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fg-3)", lineHeight: 1.5, maxWidth: 480 }}>
            Top-of-book across every venue Belief aggregates.
            Expand any venue to inspect outcome depth.
          </p>
        </div>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          padding: "6px 10px", background: "var(--bg-panel)",
          border: "1px solid var(--ink-300)", borderRadius: 999,
          fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "var(--success)",
            boxShadow: "0 0 0 3px rgba(52,211,153,.15)",
          }} />
          {breakdown.length} venues active
        </div>
      </div>

      {breakdown.length === 0 ? (
        <div className="loading">No venue data available.</div>
      ) : (
        breakdown.map((vb) => {
          const key = `${vb.venue}:${vb.sourceMarketId}`;
          return (
            <VenueRow
              key={key}
              vb={vb}
              outcomes={outcomes}
              expanded={expanded[key] ?? false}
              onToggle={() => toggle(key)}
            />
          );
        })
      )}

      <div style={{
        padding: "8px 0 0",
        fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)", lineHeight: 1.6,
        borderTop: "1px solid var(--ink-200)",
      }}>
        sizes in contracts · prices per $1 payout · the router reads from this data
      </div>
    </section>
  );
}

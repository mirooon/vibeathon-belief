import type { OutcomePriceHistory, Venue } from "@vibeahack/shared";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VENUE_COLOURS: Record<Venue, string> = {
  polymarket: "#1E88FF",
  kalshi:     "#4BD8B0",
  myriad:     "#B4B4BD",
};

const UNIFIED_COLOUR = "#5C67FF";

interface Props {
  histories: OutcomePriceHistory[];
  selectedOutcomeId: string;
  onSelectOutcome: (id: string) => void;
  outcomes: Array<{ id: string; label: string }>;
}

export function PriceChart({ histories, selectedOutcomeId, onSelectOutcome, outcomes }: Props) {
  const [showPerVenue, setShowPerVenue] = useState(true);
  const history = histories.find((h) => h.outcomeId === selectedOutcomeId);

  const data = useMemo(() => {
    if (!history) return [];
    const byTs = new Map<string, Record<string, number | string>>();
    for (const p of history.unified) {
      byTs.set(p.timestamp, { timestamp: p.timestamp, unified: p.price });
    }
    for (const perVenue of history.perVenue) {
      for (const p of perVenue.points) {
        const row = byTs.get(p.timestamp) ?? { timestamp: p.timestamp };
        row[perVenue.venue] = p.price;
        byTs.set(p.timestamp, row);
      }
    }
    return [...byTs.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [history]);

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: "var(--s-4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="eyebrow">outcome</span>
          {outcomes.map((o) => (
            <button
              key={o.id}
              onClick={() => onSelectOutcome(o.id)}
              className={`filter-btn ${o.id === selectedOutcomeId ? "active" : ""}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>overlay</span>
          {history?.perVenue.map((v) => {
            const color = VENUE_COLOURS[v.venue];
            return (
              <button
                key={v.venue}
                onClick={() => setShowPerVenue((p) => !p)}
                className={`venue-toggle ${showPerVenue ? "on" : ""}`}
                style={showPerVenue ? { borderColor: `${color}55` } : {}}
              >
                <span style={{
                  width: 10,
                  height: 2,
                  background: showPerVenue ? color : "var(--ink-400)",
                  borderRadius: 1,
                  display: "inline-block",
                }} />
                {v.venue}
              </button>
            );
          })}
        </div>
      </div>

      {history && data.length > 0 ? (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#1A1A1D" strokeDasharray="2 4" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(t) => new Date(t as string).toLocaleDateString()}
                stroke="var(--ink-500)"
                tick={{ fill: "var(--ink-500)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
                stroke="var(--ink-500)"
                tick={{ fill: "var(--ink-500)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-section)",
                  border: "1px solid var(--ink-300)",
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--fg-1)",
                  boxShadow: "var(--shadow-lg)",
                }}
                labelFormatter={(l) => new Date(l as string).toLocaleString()}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-3)" }}
              />
              <Line
                type="monotone"
                dataKey="unified"
                name="best aggregated"
                stroke={UNIFIED_COLOUR}
                strokeWidth={2.25}
                dot={{ r: 3, fill: UNIFIED_COLOUR }}
                activeDot={{ r: 5, fill: "#F7C2FF" }}
              />
              {showPerVenue &&
                history.perVenue.map((v) => (
                  <Line
                    key={v.venue}
                    type="monotone"
                    dataKey={v.venue}
                    name={v.venue}
                    stroke={VENUE_COLOURS[v.venue]}
                    strokeWidth={1.25}
                    strokeDasharray="3 4"
                    dot={false}
                    strokeOpacity={0.8}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="loading">No price history for this outcome.</div>
      )}
    </div>
  );
}

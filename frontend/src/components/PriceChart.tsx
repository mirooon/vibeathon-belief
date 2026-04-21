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
  polymarket: "#ff7f50",
  kalshi: "#4ade80",
  myriad: "#a78bfa",
};

const UNIFIED_COLOUR = "#4f86ff";

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
      <h2>Price history</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {outcomes.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelectOutcome(o.id)}
            className={o.id === selectedOutcomeId ? "badge accent" : "badge"}
            style={{ cursor: "pointer" }}
          >
            {o.label}
          </button>
        ))}
        <label style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>
          <input
            type="checkbox"
            checked={showPerVenue}
            onChange={(e) => setShowPerVenue(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          per-venue overlays
        </label>
      </div>
      {history && data.length > 0 ? (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#263149" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(t) => new Date(t as string).toLocaleDateString()}
                stroke="#8a99bd"
                fontSize={11}
              />
              <YAxis
                domain={[0, 1]}
                tickFormatter={(v) => (v as number).toFixed(2)}
                stroke="#8a99bd"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{ background: "#131a24", border: "1px solid #263149" }}
                labelFormatter={(l) => new Date(l as string).toLocaleString()}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="unified"
                name="Unified (best across venues)"
                stroke={UNIFIED_COLOUR}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              {showPerVenue &&
                history.perVenue.map((v) => (
                  <Line
                    key={v.venue}
                    type="monotone"
                    dataKey={v.venue}
                    name={v.venue}
                    stroke={VENUE_COLOURS[v.venue]}
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    dot={false}
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

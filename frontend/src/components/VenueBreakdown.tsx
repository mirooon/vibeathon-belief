import type { VenueBreakdown as VenueBreakdownType } from "@vibeahack/shared";

interface Props {
  breakdown: VenueBreakdownType[];
  outcomes: Array<{ id: string; label: string }>;
}

function fmt(p: number | null): string {
  return p === null ? "—" : p.toFixed(3);
}

export function VenueBreakdownPane({ breakdown, outcomes }: Props) {
  return (
    <div className="panel">
      <h2>Per-venue breakdown</h2>
      {breakdown.length === 0 ? (
        <div className="loading">No venue data available.</div>
      ) : (
        breakdown.map((vb) => (
          <div key={`${vb.venue}:${vb.sourceMarketId}`} style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <strong>{vb.venue}</strong>{" "}
              <span style={{ color: "var(--text-dim)", fontSize: 12 }}>
                ({vb.sourceMarketId})
              </span>
            </div>
            <table className="venue-table">
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th>Best bid</th>
                  <th>Best ask</th>
                  <th>Bid depth</th>
                  <th>Ask depth</th>
                </tr>
              </thead>
              <tbody>
                {vb.outcomes.map((o) => {
                  const label =
                    outcomes.find((c) => c.id === o.outcomeId)?.label ?? o.outcomeId;
                  return (
                    <tr key={o.outcomeId}>
                      <td>{label}</td>
                      <td>{fmt(o.bestBid)}</td>
                      <td>{fmt(o.bestAsk)}</td>
                      <td>{o.bidDepth}</td>
                      <td>{o.askDepth}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

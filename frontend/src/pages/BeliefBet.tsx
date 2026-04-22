import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { BeliefRouteMatch } from "@vibeahack/shared";
import { useBeliefRoute } from "../api/hooks.js";

const SUGGESTIONS: Array<{ belief: string; budget: number }> = [
  { belief: "France will win the World Cup", budget: 100 },
  { belief: "Bitcoin hits 200k this year", budget: 250 },
  { belief: "The Fed cuts interest rates", budget: 50 },
  { belief: "Trump imposes tariffs on Europe", budget: 100 },
];

const VENUE_LABEL: Record<string, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  myriad: "Myriad",
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "var(--ink-300)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--lifi-gradient)",
            borderRadius: 2,
            transition: "width 0.4s var(--ease-out-soft)",
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-3)",
          minWidth: 32,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

function fmtUsd(v: number, digits = 2): string {
  return `$${v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

function outcomePolarity(label: string): "yes" | "no" | null {
  const n = label.trim().toLowerCase();
  if (n === "yes" || n === "y") return "yes";
  if (n === "no" || n === "n") return "no";
  return null;
}

function OutcomeBadge({ label }: { label: string }) {
  const polarity = outcomePolarity(label);
  const bg =
    polarity === "yes"
      ? "rgba(52,211,153,0.16)"
      : polarity === "no"
        ? "rgba(248,113,113,0.16)"
        : "var(--ink-300)";
  const fg =
    polarity === "yes"
      ? "var(--success)"
      : polarity === "no"
        ? "var(--danger)"
        : "var(--fg-1)";
  const ring =
    polarity === "yes"
      ? "0 0 0 1px rgba(52,211,153,0.35)"
      : polarity === "no"
        ? "0 0 0 1px rgba(248,113,113,0.35)"
        : undefined;
  return (
    <div
      title={`bet on ${label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 16px",
        borderRadius: "var(--r-pill)",
        background: bg,
        color: fg,
        boxShadow: ring,
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "positive" | "muted";
}) {
  const color =
    accent === "positive"
      ? "var(--success)"
      : accent === "muted"
        ? "var(--fg-3)"
        : "var(--fg-1)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.05em",
          color: "var(--fg-3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 500,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function MatchCard({
  match,
  isTop,
}: {
  match: BeliefRouteMatch;
  isTop: boolean;
}) {
  const { market, outcome, route, score } = match;
  const payoutIfWins = route.filledSizeShares; // each share = $1 on YES
  const profitIfWins = payoutIfWins - route.totalCostUsd;
  const profitPct =
    route.totalCostUsd > 0 ? (profitIfWins / route.totalCostUsd) * 100 : 0;

  return (
    <div
      className="market-card"
      style={{
        marginBottom: "var(--s-4)",
        border: isTop ? "1.5px solid var(--lifi-blue)" : undefined,
        boxShadow: isTop ? "0 0 0 3px rgba(92,103,255,0.08)" : undefined,
      }}
    >
      {/* Top row: title + prominent outcome badge */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--s-4)",
          marginBottom: "var(--s-4)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {isTop && (
            <span
              className="eyebrow"
              style={{ color: "var(--lifi-blue)", marginBottom: 4, display: "block" }}
            >
              best match
            </span>
          )}
          <h3 style={{ margin: 0, fontSize: "var(--fs-body)", fontWeight: 500 }}>
            {market.title}
          </h3>
        </div>
        <OutcomeBadge label={outcome.outcomeLabel} />
      </div>

      <ScoreBar score={score} />

      {/* Core stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "var(--s-4)",
          marginTop: "var(--s-4)",
          padding: "var(--s-4)",
          background: "var(--bg-elev)",
          borderRadius: "var(--r-lg)",
          border: "1px solid var(--ink-200)",
        }}
      >
        <Stat label="you pay" value={fmtUsd(route.totalCostUsd)} />
        <Stat
          label={`if ${outcome.outcomeLabel.toLowerCase()}, receive`}
          value={fmtUsd(payoutIfWins)}
          accent="positive"
        />
        <Stat
          label="profit"
          value={`${fmtUsd(profitIfWins)} (${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(0)}%)`}
          accent={profitIfWins > 0 ? "positive" : "muted"}
        />
        <Stat
          label="blended price"
          value={`${(route.blendedPrice * 100).toFixed(1)}¢`}
          accent="muted"
        />
      </div>

      {/* Venue splits */}
      {route.splits.length > 0 && (
        <div style={{ marginTop: "var(--s-4)" }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
              marginBottom: 8,
            }}
          >
            //route
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-2)",
            }}
          >
            {route.splits.map((s, i) => (
              <div
                key={`${s.venue}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto auto",
                  gap: "var(--s-3)",
                  padding: "6px 10px",
                  background: "var(--bg-section)",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--ink-200)",
                }}
              >
                <span style={{ color: "var(--fg-1)" }}>
                  {VENUE_LABEL[s.venue] ?? s.venue}
                </span>
                <span>{s.sizeShares.toFixed(2)} sh</span>
                <span>@ {(s.avgPrice * 100).toFixed(1)}¢</span>
                <span style={{ color: "var(--fg-3)" }}>
                  {fmtUsd(s.notionalUsd)} + {fmtUsd(s.fees)} fee
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer meta + CTA */}
      <div
        className="meta"
        style={{
          marginTop: "var(--s-4)",
          marginBottom: 0,
          display: "flex",
          alignItems: "center",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <span
          className={`badge ${market.status === "open" ? "success" : "warning"}`}
        >
          {market.status}
        </span>
        <span className="badge">{market.category}</span>
        {market.venues.map((v) => (
          <span key={v} className="badge">
            {v}
          </span>
        ))}
        {route.unfilledBudgetUsd > 0.01 && (
          <span
            className="badge warning"
            title="cross-venue depth insufficient for full budget"
          >
            {fmtUsd(route.unfilledBudgetUsd)} unfilled
          </span>
        )}
        <span style={{ flex: 1 }} />
        <Link
          to={`/markets/${encodeURIComponent(market.id)}`}
          style={{
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            color: "var(--lifi-blue)",
            textDecoration: "none",
            padding: "6px 12px",
            border: "1px solid var(--lifi-blue)",
            borderRadius: "var(--r-pill)",
          }}
        >
          view market →
        </Link>
      </div>
    </div>
  );
}

type Side = "auto" | "yes" | "no";

export function BeliefBet() {
  const [belief, setBelief] = useState("");
  const [amount, setAmount] = useState(100);
  const [side, setSide] = useState<Side>("auto");
  const [debouncedBelief, setDebouncedBelief] = useState("");
  const [debouncedAmount, setDebouncedAmount] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedBelief(belief.trim());
      setDebouncedAmount(amount);
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [belief, amount]);

  const { data, isLoading, isFetching, error } = useBeliefRoute(
    debouncedBelief,
    debouncedAmount,
    side === "auto" ? undefined : side,
  );

  const showResults = debouncedBelief.length >= 3 && debouncedAmount > 0;
  const pending = isLoading || isFetching;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "var(--s-8) 0 var(--s-16)" }}>
      <span className="eyebrow" style={{ marginBottom: "var(--s-4)", display: "block" }}>
        bet
      </span>
      <h1
        style={{
          fontSize: "clamp(36px, 5vw, 56px)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          margin: "0 0 var(--s-3)",
          color: "var(--fg-1)",
        }}
      >
        Find the{" "}
        <span
          style={{
            background: "var(--lifi-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          best route
        </span>
        <br />
        for your belief.
      </h1>
      <p
        style={{
          color: "var(--fg-3)",
          fontSize: "var(--fs-body)",
          margin: "0 0 var(--s-6)",
          maxWidth: 560,
        }}
      >
        Tell us what you think will happen and how much you'd bet. We'll route
        your wager across Polymarket, Kalshi, and Myriad for the best blended price.
      </p>

      {/* Inputs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 180px",
          gap: "var(--s-3)",
          marginBottom: "var(--s-4)",
        }}
      >
        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={belief}
            onChange={(e) => setBelief(e.target.value)}
            placeholder="e.g. France will win the World Cup…"
            autoFocus
            style={{
              width: "100%",
              padding: "16px 52px 16px 20px",
              background: "var(--bg-section)",
              color: "var(--fg-1)",
              border: `1.5px solid ${belief.length >= 3 ? "var(--lifi-blue)" : "var(--ink-300)"}`,
              borderRadius: "var(--r-xl)",
              fontSize: "var(--fs-body)",
              fontFamily: "var(--font-body)",
              outline: "none",
              transition: "border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)",
              boxShadow: belief.length >= 3 ? "0 0 0 3px rgba(92,103,255,0.12)" : "none",
            }}
          />
          {pending && (
            <div
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
                width: 16,
                height: 16,
                border: "2px solid var(--ink-300)",
                borderTop: "2px solid var(--lifi-blue)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          )}
        </div>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-body)",
              pointerEvents: "none",
            }}
          >
            $
          </span>
          <input
            type="number"
            min={1}
            max={1_000_000}
            step={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            placeholder="100"
            style={{
              width: "100%",
              padding: "16px 16px 16px 32px",
              background: "var(--bg-section)",
              color: "var(--fg-1)",
              border: `1.5px solid ${amount > 0 ? "var(--lifi-blue)" : "var(--ink-300)"}`,
              borderRadius: "var(--r-xl)",
              fontSize: "var(--fs-body)",
              fontFamily: "var(--font-mono)",
              outline: "none",
              transition: "border-color var(--dur-base) var(--ease-standard)",
            }}
          />
        </div>
      </div>

      {/* Side toggle — overrides auto-detected Yes/No polarity */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-3)",
          marginBottom: "var(--s-6)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-3)",
            letterSpacing: "0.04em",
          }}
        >
          //side
        </span>
        <div
          style={{
            display: "inline-flex",
            padding: 3,
            gap: 2,
            background: "var(--bg-section)",
            border: "1px solid var(--ink-300)",
            borderRadius: "var(--r-pill)",
          }}
        >
          {(["auto", "yes", "no"] as const).map((s) => {
            const active = side === s;
            const accent =
              s === "yes"
                ? "var(--success)"
                : s === "no"
                  ? "var(--danger)"
                  : "var(--lifi-blue)";
            const activeBg =
              s === "yes"
                ? "rgba(52,211,153,0.16)"
                : s === "no"
                  ? "rgba(248,113,113,0.16)"
                  : "rgba(92,103,255,0.16)";
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  appearance: "none",
                  border: "none",
                  background: active ? activeBg : "transparent",
                  color: active ? accent : "var(--fg-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "6px 14px",
                  borderRadius: "var(--r-pill)",
                  cursor: "pointer",
                  transition: "all var(--dur-fast) var(--ease-standard)",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
        {side === "auto" && (
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            — detected from belief text
          </span>
        )}
      </div>

      {/* Suggestions */}
      {!showResults && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--s-8)" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s.belief}
              onClick={() => {
                setBelief(s.belief);
                setAmount(s.budget);
              }}
              style={{
                background: "var(--bg-section)",
                border: "1px solid var(--ink-300)",
                borderRadius: "var(--r-pill)",
                padding: "6px 14px",
                fontSize: 13,
                color: "var(--fg-2)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all var(--dur-fast) var(--ease-standard)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--lifi-blue)";
                e.currentTarget.style.color = "var(--fg-1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--ink-300)";
                e.currentTarget.style.color = "var(--fg-2)";
              }}
            >
              {s.belief} · ${s.budget}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {showResults && error && (
        <div
          className="loading"
          style={{ color: "var(--danger)", marginTop: "var(--s-5)" }}
        >
          {(error as Error).message}
        </div>
      )}

      {/* Results */}
      {showResults && data && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "var(--s-5)",
              marginTop: "var(--s-6)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
                letterSpacing: "0.04em",
              }}
            >
              //routes
            </span>
            <span style={{ flex: 1, height: 1, background: "var(--ink-200)" }} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
              }}
            >
              {data.matches.length} found · budget {fmtUsd(data.budgetUsd)}
            </span>
          </div>

          {data.matches.length === 0 && (
            <div className="loading">
              No matching markets with liquidity. Try a different belief or larger budget.
            </div>
          )}

          {data.matches.map((m, i) => (
            <MatchCard key={m.market.id} match={m} isTop={i === 0} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}

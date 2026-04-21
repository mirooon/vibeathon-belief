import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBeliefSearch } from "../api/hooks.js";

const SUGGESTIONS = [
  "Donald Trump will stop the war on Iran",
  "Bitcoin hits 200k this year",
  "France wins the World Cup",
  "The Fed cuts interest rates",
  "Trump imposes tariffs on Europe",
];

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

export function Belief() {
  const [input, setInput] = useState("");
  const [debouncedBelief, setDebouncedBelief] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedBelief(input.trim()), 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [input]);

  const { data, isLoading, isFetching } = useBeliefSearch(debouncedBelief);

  const showResults = debouncedBelief.length >= 3;
  const pending = isLoading || isFetching;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "var(--s-8) 0 var(--s-16)" }}>
      {/* Header */}
      <span className="eyebrow" style={{ marginBottom: "var(--s-4)", display: "block" }}>
        belief
      </span>
      <h1
        style={{
          fontSize: "clamp(36px, 5vw, 56px)",
          fontWeight: 500,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          margin: "0 0 var(--s-8)",
          color: "var(--fg-1)",
        }}
      >
        Tell us what you{" "}
        <span
          style={{
            background: "var(--lifi-gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          believe
        </span>
        <br />
        will happen.
      </h1>

      {/* Input */}
      <div style={{ position: "relative", marginBottom: "var(--s-4)" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Donald Trump will stop the war on Iran…"
          autoFocus
          style={{
            width: "100%",
            padding: "16px 52px 16px 20px",
            background: "var(--bg-section)",
            color: "var(--fg-1)",
            border: `1.5px solid ${input.length >= 3 ? "var(--lifi-blue)" : "var(--ink-300)"}`,
            borderRadius: "var(--r-xl)",
            fontSize: "var(--fs-body)",
            fontFamily: "var(--font-body)",
            outline: "none",
            transition: "border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)",
            boxShadow: input.length >= 3 ? "0 0 0 3px rgba(92,103,255,0.12)" : "none",
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
        {!pending && input.length >= 3 && (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--lifi-blue)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            →
          </div>
        )}
      </div>

      {/* Suggestion chips */}
      {!showResults && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--s-8)" }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
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
              {s}
            </button>
          ))}
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
              //matches
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "var(--ink-200)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
              }}
            >
              {data.matches.length} found
            </span>
          </div>

          {data.matches.length === 0 && (
            <div className="loading">
              No matching markets found. Try a different belief.
            </div>
          )}

          {data.matches.map(({ market, score }) => (
            <Link
              key={market.id}
              to={`/markets/${encodeURIComponent(market.id)}`}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div
                className="market-card"
                style={{ marginBottom: "var(--s-3)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "var(--s-4)",
                    marginBottom: "var(--s-3)",
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: "var(--fs-body)", fontWeight: 500 }}>
                    {market.title}
                  </h3>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--fg-3)",
                      whiteSpace: "nowrap",
                      paddingTop: 2,
                    }}
                  >
                    →
                  </span>
                </div>

                <ScoreBar score={score} />

                <div
                  className="meta"
                  style={{ marginTop: "var(--s-3)", marginBottom: 0 }}
                >
                  <span className={`badge ${market.status === "open" ? "success" : "warning"}`}>
                    {market.status}
                  </span>
                  <span className="badge">{market.category}</span>
                  {market.venues.map((v) => (
                    <span key={v} className="badge">{v}</span>
                  ))}
                  <span className="meta-dot" />
                  <span
                    style={{
                      color: "var(--fg-3)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                    }}
                  >
                    resolves {new Date(market.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}

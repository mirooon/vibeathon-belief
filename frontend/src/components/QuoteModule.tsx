import type { OrderSide, QuoteRoute } from "@vibeahack/shared";
import { useState } from "react";
import { useQuote } from "../api/hooks.js";

interface Props {
  logicalMarketId: string;
  outcomes: Array<{ id: string; label: string }>;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function SidePill({
  side, label, active, onClick,
}: {
  side: OrderSide; label: string; active: boolean; onClick: () => void;
}) {
  const isBuy = side === "buy";
  const color = isBuy ? "var(--success)" : "var(--danger)";
  const bg = isBuy ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)";
  const border = isBuy ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)";
  return (
    <button onClick={onClick} style={{
      background: active ? bg : "var(--bg-panel)",
      border: `1px solid ${active ? border : "var(--ink-300)"}`,
      color: "var(--fg-1)", borderRadius: 14, padding: "14px 16px",
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
      transition: "all var(--dur-fast) var(--ease-standard)",
      flex: 1,
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
        {label}
      </span>
    </button>
  );
}

function Radio({ on, optimal }: { on: boolean; optimal: boolean }) {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
      border: on ? "1px solid transparent" : "1px solid var(--ink-400)",
      background: on
        ? (optimal ? "linear-gradient(135deg,#F7C2FF,#5C67FF)" : "var(--lifi-pink)")
        : "transparent",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      {on && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--bg-section)" }} />}
    </span>
  );
}

function RouteCard({
  route, selected, onSelect,
}: {
  route: QuoteRoute; selected: boolean; onSelect: () => void;
}) {
  const isOpt = route.isOptimal;
  const isFull = route.unfilledSize === 0;
  const summary = route.splits.length
    ? route.splits.map((s) => `${fmtUsd(s.size * s.avgPrice)} on ${s.venue} @ $${s.avgPrice.toFixed(3)}`).join(" + ")
      + (route.unfilledSize > 0 ? ` · ${fmtUsd(route.unfilledSize * route.blendedPrice)} unfilled` : "")
    : "—";

  return (
    <div onClick={onSelect} style={{
      position: "relative", cursor: "pointer",
      background: selected && isOpt
        ? "linear-gradient(135deg, rgba(247,194,255,0.06), rgba(92,103,255,0.06))"
        : "var(--bg-panel)",
      border: `1px solid ${selected ? (isOpt ? "transparent" : "rgba(247,194,255,0.5)") : "var(--ink-200)"}`,
      borderRadius: 14, padding: selected && isOpt ? "13px 15px" : "14px 16px",
      transition: "all var(--dur-fast) var(--ease-standard)",
    }}>
      {/* Gradient border for selected+optimal */}
      {selected && isOpt && (
        <span aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: 14, padding: 1,
          background: "linear-gradient(135deg,#F7C2FF,#5C67FF)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Radio on={selected} optimal={isOpt && selected} />
          <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "var(--fg-1)" }}>{route.label}</span>
              {isOpt && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
                  padding: "2px 6px", borderRadius: 999,
                  background: "linear-gradient(135deg, rgba(247,194,255,0.2), rgba(92,103,255,0.2))",
                  color: "var(--lifi-pink)", border: "1px solid rgba(247,194,255,0.25)",
                }}>
                  ★ Best
                </span>
              )}
            </div>
            <span style={{
              fontSize: 11, color: "var(--fg-3)", lineHeight: 1.4,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300,
              fontFamily: "var(--font-mono)",
            }}>
              {summary}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 500,
            fontVariantNumeric: "tabular-nums", color: "var(--fg-1)", letterSpacing: "-0.01em",
          }}>
            ${route.blendedPrice.toFixed(4)}
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontVariantNumeric: "tabular-nums",
            color: isFull ? "var(--fg-muted)" : "var(--warning)",
          }}>
            {fmtUsd(route.filledSize * route.blendedPrice)}/{fmtUsd((route.filledSize + route.unfilledSize) * route.blendedPrice)}{!isFull && " · partial"}
          </span>
        </div>
      </div>

      <div style={{
        display: "flex", gap: 14, marginTop: 10, paddingTop: 10,
        borderTop: "1px dashed var(--ink-200)",
        fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)",
      }}>
        <span>fees {fmtUsd(route.totalFees)}</span>
        <span>slip {route.estimatedSlippageBps} bps</span>
        {!isFull && (
          <span style={{ color: "var(--warning)" }}>• {fmtUsd(route.unfilledSize * route.blendedPrice)} unfilled</span>
        )}
      </div>
    </div>
  );
}

function PreviewRow({ label, value, muted = false }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums",
        fontSize: muted ? 12 : 13, fontWeight: 500,
        color: muted ? "var(--fg-2)" : "var(--fg-1)",
      }}>{value}</span>
    </div>
  );
}

export function QuoteModule({ logicalMarketId, outcomes }: Props) {
  const initialOutcomeId = outcomes[0]?.id ?? "";
  const [outcomeId, setOutcomeId] = useState(initialOutcomeId);
  const [side, setSide] = useState<OrderSide>("buy");
  const [dollars, setDollars] = useState(100);
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [lastRequestKey, setLastRequestKey] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  const req = outcomeId && dollars > 0 ? { outcomeId, side, size: Math.max(1, Math.round(dollars / 0.5)) } : null;
  const { data: quote, isLoading, error } = useQuote(logicalMarketId, req);

  const requestKey = `${outcomeId}|${side}|${dollars}`;
  if (requestKey !== lastRequestKey) {
    setLastRequestKey(requestKey);
    setUserChoice(null);
  }

  const optimalId = quote?.routes.find((r) => r.isOptimal)?.id ?? null;
  const selectedRouteId = userChoice ?? optimalId;
  const selected = quote?.routes.find((r) => r.id === selectedRouteId);

  const youPay = selected ? selected.blendedPrice * selected.filledSize + selected.totalFees : 0;
  const ifWins = selected ? selected.filledSize * 1.0 : 0;
  const profit = ifWins - youPay;
  const pctReturn = youPay > 0 ? (profit / youPay) * 100 : 0;

  return (
    <section style={{
      background: "var(--bg-section)",
      border: "1px solid var(--ink-200)",
      borderRadius: 24,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      boxShadow: "0 24px 80px rgba(0,0,0,.45), 0 0 80px rgba(247,194,255,.04)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="eyebrow">trade</span>
        {outcomes.length > 1 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {outcomes.map((o) => (
              <button
                key={o.id}
                onClick={() => setOutcomeId(o.id)}
                className={`filter-btn ${o.id === outcomeId ? "active" : ""}`}
                style={{ fontSize: 11 }}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buy/Sell side toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <SidePill side="buy" label="Buy" active={side === "buy"} onClick={() => setSide("buy")} />
        <SidePill side="sell" label="Sell" active={side === "sell"} onClick={() => setSide("sell")} />
      </div>

      {/* Amount input (dollars) */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6,
        }}>
          <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>amount</span>
          <span style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>USD</span>
        </div>
        <div style={{
          background: "var(--bg-panel)", border: "1px solid var(--ink-300)",
          borderRadius: 12, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 22, color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontWeight: 500 }}>$</span>
          <input
            type="number"
            value={dollars}
            min={1}
            onChange={(e) => setDollars(Math.max(1, parseFloat(e.target.value || "1")))}
            style={{
              flex: 1, background: "transparent", border: 0, outline: "none",
              color: "var(--fg-1)", fontFamily: "var(--font-mono)",
              fontSize: 24, fontWeight: 500, letterSpacing: "-0.01em",
              fontVariantNumeric: "tabular-nums", padding: 0, minWidth: 0,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {[10, 25, 100, 500, "Max"].map((c) => (
            <button
              key={c}
              onClick={() => setDollars(c === "Max" ? 500 : (c as number))}
              style={{
                background: "var(--bg-panel)", border: "1px solid var(--ink-300)", borderRadius: 8,
                color: "var(--fg-2)", padding: "4px 10px", fontFamily: "inherit", fontSize: 12,
                cursor: "pointer", fontWeight: 500,
                transition: "all var(--dur-fast) var(--ease-standard)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink-500)"; e.currentTarget.style.color = "var(--fg-1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--ink-300)"; e.currentTarget.style.color = "var(--fg-2)"; }}
            >
              {c === "Max" ? "Max" : `$${c}`}
            </button>
          ))}
          {selected && (
            <span style={{
              marginLeft: "auto", fontSize: 12, color: "var(--fg-3)",
              display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono)",
            }}>
              ≈ <span style={{ color: "var(--fg-1)", fontVariantNumeric: "tabular-nums" }}>
                {selected.filledSize} shares
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Routes */}
      <div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8,
        }}>
          <span className="eyebrow">route</span>
          {quote && (
            <span style={{ fontSize: 11, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
              {quote.routes.length} options
            </span>
          )}
        </div>

        {isLoading && (
          <div style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)", padding: "8px 0" }}>
            computing routes…
          </div>
        )}
        {error && (
          <div className="error" style={{ fontSize: 12 }}>
            {String(error)}
          </div>
        )}
        {quote && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {quote.routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                selected={route.id === selectedRouteId}
                onSelect={() => setUserChoice(route.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      {selected && (
        <div style={{
          background: "var(--bg-panel)", border: "1px solid var(--ink-300)",
          borderRadius: 12, padding: "14px 16px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>blended_price</span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              ...(selected.isOptimal ? {
                background: "linear-gradient(135deg,#F7C2FF,#5C67FF)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              } : { color: "var(--fg-1)" }),
            }}>
              ${selected.blendedPrice.toFixed(4)}
            </span>
          </div>
          <div style={{ height: 1, background: "var(--ink-200)" }} />
          <PreviewRow label="you_pay" value={fmtUsd(youPay)} />
          <PreviewRow
            label="if_yes_wins_you_receive"
            value={fmtUsd(ifWins)}
          />
          <PreviewRow
            label="implied_profit"
            value={
              <span style={{ color: profit >= 0 ? "var(--success)" : "var(--danger)" }}>
                {profit >= 0 ? "+" : ""}{fmtUsd(profit)} · {profit >= 0 ? "+" : ""}{pctReturn.toFixed(1)}%
              </span>
            }
          />
          <PreviewRow label="fees" value={fmtUsd(selected.totalFees)} muted />
        </div>
      )}

      {/* Execute button */}
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button disabled style={{
          width: "100%",
          background: "linear-gradient(135deg,#F7C2FF,#5C67FF)",
          color: "var(--ink-0)", border: 0, borderRadius: 14, padding: "16px",
          fontFamily: "inherit", fontSize: 15, fontWeight: 600,
          cursor: "not-allowed", opacity: 0.5,
          boxShadow: "0 0 40px rgba(92,103,255,.2)",
          letterSpacing: "-0.005em",
        }}>
          Execute trade
        </button>
        {showTooltip && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
            background: "var(--bg-section)", border: "1px solid var(--ink-300)",
            borderRadius: 10, padding: "10px 12px",
            fontSize: 11, color: "var(--fg-2)", lineHeight: 1.5,
            boxShadow: "var(--shadow-lg)", pointerEvents: "none", zIndex: 10,
          }}>
            Live execution launches with <span style={{ color: "var(--fg-1)" }}>Phase 2</span>.
            This is a Phase 1 demo of the routing engine.
          </div>
        )}
      </div>
    </section>
  );
}

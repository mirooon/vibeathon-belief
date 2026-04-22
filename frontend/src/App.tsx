import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useHealth } from "./api/hooks.js";
import { Belief } from "./pages/Belief.js";
import { BeliefBet } from "./pages/BeliefBet.js";
import { Event } from "./pages/Event.js";
import { Events } from "./pages/Events.js";
import { Market } from "./pages/Market.js";
import logoSrc from "./assets/logo_lifi_dark_horizontal.svg";

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api/v1";

function HealthDot() {
  const { data, isLoading, isError } = useHealth();
  if (isLoading) {
    return (
      <span title="Checking API…" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-400)" }} />
        connecting
      </span>
    );
  }
  if (isError || !data) {
    return (
      <span title="API unavailable" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, color: "var(--danger)", fontFamily: "var(--font-mono)",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />
        api down
      </span>
    );
  }
  const isMongoUp = data.mongo === "up";
  return (
    <span
      title={`API up · mongo ${data.mongo} · ${data.uptimeSec}s uptime`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, color: isMongoUp ? "var(--success)" : "var(--warning)",
        fontFamily: "var(--font-mono)", cursor: "default",
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isMongoUp ? "var(--success)" : "var(--warning)",
        boxShadow: isMongoUp ? "0 0 0 3px rgba(52,211,153,.18)" : "0 0 0 3px rgba(251,191,36,.18)",
      }} />
      {isMongoUp ? "live" : "mongo down"}
    </span>
  );
}

export function App() {
  const location = useLocation();
  const isEvents = location.pathname === "/";
  const isBelief = location.pathname === "/belief";
  const isBet = location.pathname === "/bet";

  return (
    <>
      <nav className="nav">
        <div className="nav-brand">
          <Link to="/">
            <img src={logoSrc} className="nav-logo" alt="LI.FI" />
          </Link>
          <span className="nav-divider" />
          <div className="nav-links">
            <Link to="/" className={`nav-link ${isEvents ? "active" : ""}`}>Events</Link>
          </div>
          <Link
            to="/belief"
            style={{
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontFamily: "var(--font-mono)",
              padding: "4px 12px",
              borderRadius: "var(--r-pill)",
              border: `1px solid ${isBelief ? "rgba(167,139,250,0.6)" : "rgba(167,139,250,0.25)"}`,
              background: isBelief ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.05)",
              color: isBelief ? "rgb(196,167,255)" : "rgba(167,139,250,0.75)",
              transition: "all var(--dur-fast) var(--ease-standard)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isBelief) {
                e.currentTarget.style.background = "rgba(139,92,246,0.10)";
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.45)";
                e.currentTarget.style.color = "rgb(196,167,255)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isBelief) {
                e.currentTarget.style.background = "rgba(139,92,246,0.05)";
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.25)";
                e.currentTarget.style.color = "rgba(167,139,250,0.75)";
              }
            }}
          >
            ✨ belief
          </Link>
          <Link to="/bet" style={{ textDecoration: "none" }}>
            <span
              className="nav-badge"
              style={{
                cursor: "pointer",
                transition: "opacity var(--dur-fast) var(--ease-standard)",
                opacity: isBet ? 1 : 0.75,
                background: isBet ? "rgba(247,194,255,0.14)" : undefined,
              }}
            >
              bet
            </span>
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <HealthDot />
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)",
              textDecoration: "none", padding: "4px 10px",
              border: "1px solid var(--ink-300)", borderRadius: "var(--r-pill)",
              transition: "all var(--dur-fast) var(--ease-standard)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--ink-500)";
              e.currentTarget.style.color = "var(--fg-2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--ink-300)";
              e.currentTarget.style.color = "var(--fg-3)";
            }}
          >
            //swagger_ui
          </a>
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<Events />} />
          <Route path="/events/:id" element={<Event />} />
          <Route path="/markets/:id" element={<Market />} />
          <Route path="/belief" element={<Belief />} />
          <Route path="/bet" element={<BeliefBet />} />
        </Routes>
      </main>
    </>
  );
}

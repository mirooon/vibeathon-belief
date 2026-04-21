import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useHealth } from "./api/hooks.js";
import { Belief } from "./pages/Belief.js";
import { Event } from "./pages/Event.js";
import { Events } from "./pages/Events.js";
import { Market } from "./pages/Market.js";
import { Markets } from "./pages/Markets.js";
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
  const isMarkets = location.pathname === "/markets";
  const isBelief = location.pathname === "/belief";

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
            <Link to="/markets" className={`nav-link ${isMarkets ? "active" : ""}`}>Markets</Link>
          </div>
          <Link to="/belief" style={{ textDecoration: "none" }}>
            <span
              className="nav-badge"
              style={{
                cursor: "pointer",
                transition: "opacity var(--dur-fast) var(--ease-standard)",
                opacity: isBelief ? 1 : 0.75,
                background: isBelief ? "rgba(247,194,255,0.14)" : undefined,
              }}
            >
              belief
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
          <Route path="/markets" element={<Markets />} />
          <Route path="/markets/:id" element={<Market />} />
          <Route path="/belief" element={<Belief />} />
        </Routes>
      </main>
    </>
  );
}

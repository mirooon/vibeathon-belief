import { Link, Route, Routes } from "react-router-dom";
import { Market } from "./pages/Market.js";
import { Markets } from "./pages/Markets.js";

export function App() {
  return (
    <>
      <nav className="nav">
        <Link to="/" style={{ color: "inherit" }}>
          <h1>Vibeahack — Prediction Markets Aggregator</h1>
        </Link>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<Markets />} />
          <Route path="/markets/:id" element={<Market />} />
        </Routes>
      </main>
    </>
  );
}

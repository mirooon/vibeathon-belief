import type {
  MarketSortField,
  MarketSortOrder,
  MarketStatus,
  Venue,
} from "@vibeahack/shared";
import { ALL_VENUES } from "@vibeahack/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMarkets } from "../api/hooks.js";

const VENUE_LABELS: Record<Venue, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  myriad: "Myriad",
};

type SortFieldChoice = {
  label: string;
  value: MarketSortField;
  defaultOrder: MarketSortOrder;
  ascLabel: string;
  descLabel: string;
};

const SORT_FIELDS: SortFieldChoice[] = [
  {
    label: "24hr Volume",
    value: "volume24h",
    defaultOrder: "desc",
    ascLabel: "Low to high",
    descLabel: "High to low",
  },
  {
    label: "TVL",
    value: "tvl",
    defaultOrder: "desc",
    ascLabel: "Low to high",
    descLabel: "High to low",
  },
  {
    label: "End Date",
    value: "endDate",
    defaultOrder: "asc",
    ascLabel: "Ending soon",
    descLabel: "Ending latest",
  },
];

type StatusChoice = { label: string; value: MarketStatus | undefined };
const STATUS_CHOICES: StatusChoice[] = [
  { label: "Active", value: "open" },
  { label: "Resolved", value: "resolved" },
  { label: "All", value: undefined },
];

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function formatCents(p: number | null): string {
  if (p === null) return "—";
  return `${Math.round(p * 100)}¢`;
}

function formatPct(p: number | null): string {
  if (p === null) return "—";
  return `${Math.round(p * 100)}%`;
}

function iconInitial(title: string): string {
  const first = title.trim()[0];
  return first ? first.toUpperCase() : "?";
}

function SortIcon() {
  return (
    <svg className="lead" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M5 3v10m0 0l-3-3m3 3l3-3M11 13V3m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortDirIcon({ order }: { order: MarketSortOrder }) {
  if (order === "desc") {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 13V3m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="lead" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 3h12M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function VenueIcon() {
  return (
    <svg className="lead" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 6l5-3 5 3v7H3V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 13v-3h2v3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg className="pm-empty-icon" viewBox="0 0 48 48" fill="none">
      <path d="M6 34l12-12 8 8 16-16M30 14h12v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Markets() {
  const [status, setStatus] = useState<MarketStatus | undefined>("open");
  const [sortField, setSortField] = useState<MarketSortField>("volume24h");
  const [sortOrder, setSortOrder] = useState<MarketSortOrder>("desc");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [venue, setVenue] = useState<Venue | null>(null);

  const sortFieldChoice =
    SORT_FIELDS.find((c) => c.value === sortField) ?? SORT_FIELDS[0]!;

  const handleSortFieldChange = (value: MarketSortField) => {
    const next = SORT_FIELDS.find((c) => c.value === value) ?? SORT_FIELDS[0]!;
    setSortField(next.value);
    setSortOrder(next.defaultOrder);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const filter = {
    ...(status ? { status } : {}),
    ...(venue ? { venues: [venue] } : {}),
    sortBy: sortField,
    sortOrder,
  };
  const { data, isLoading, error } = useMarkets(filter);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const m of data.items) set.add(m.category);
    return Array.from(set).sort();
  }, [data]);

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.items.filter((m) => {
      if (category && m.category !== category) return false;
      if (q && !m.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, category, search]);

  return (
    <div className="pm-panel">
      <div className="pm-header-row">
        <h1 className="pm-title-lg">All events</h1>
        <div className="pm-search">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
          />
        </div>
      </div>

      <div className="pm-controls-row">
        <label className="pm-pill-select">
          <SortIcon />
          <select
            value={sortField}
            onChange={(e) => handleSortFieldChange(e.target.value as MarketSortField)}
          >
            {SORT_FIELDS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="pm-pill-btn"
          onClick={toggleSortOrder}
          title="Toggle sort direction"
          aria-label={
            sortOrder === "asc"
              ? sortFieldChoice.ascLabel
              : sortFieldChoice.descLabel
          }
        >
          <SortDirIcon order={sortOrder} />
          <span>
            {sortOrder === "asc"
              ? sortFieldChoice.ascLabel
              : sortFieldChoice.descLabel}
          </span>
        </button>

        <label className="pm-pill-select">
          <FilterIcon />
          <select
            value={status ?? ""}
            onChange={(e) =>
              setStatus(e.target.value === "" ? undefined : (e.target.value as MarketStatus))
            }
          >
            {STATUS_CHOICES.map((s) => (
              <option key={s.label} value={s.value ?? ""}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="pm-pill-select">
          <VenueIcon />
          <select
            value={venue ?? ""}
            onChange={(e) =>
              setVenue(e.target.value === "" ? null : (e.target.value as Venue))
            }
          >
            <option value="">All markets</option>
            {ALL_VENUES.map((v) => (
              <option key={v} value={v}>
                {VENUE_LABELS[v]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {categories.length > 0 && (
        <div className="pm-category-row">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`pm-category-pill ${category === null ? "active" : ""}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`pm-category-pill ${category === c ? "active" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading && <div className="loading">Loading markets…</div>}
      {error && <div className="error">Failed to load: {String(error)}</div>}

      {data && visibleItems.length === 0 && (
        <div className="pm-empty">
          <TrendingIcon />
          <h3 className="pm-empty-title">No markets found</h3>
          <p className="pm-empty-sub">
            Try selecting a different category or clearing your filters
          </p>
        </div>
      )}

      {data && visibleItems.length > 0 && (
        <div className="pm-grid">
          {visibleItems.map((m) => {
            const sortedOutcomes = [...m.outcomes].sort((a, b) => {
              const av = a.bestAsk ?? -1;
              const bv = b.bestAsk ?? -1;
              return bv - av;
            });
            const hasOverflow = sortedOutcomes.length > 4;
            return (
              <Link
                to={`/markets/${encodeURIComponent(m.id)}`}
                key={m.id}
                style={{ color: "inherit", textDecoration: "none", display: "block" }}
              >
                <div className="pm-card">
                  <div className="pm-card-top">
                    <div className="pm-icon">{iconInitial(m.title)}</div>
                    <h3 className="pm-title">{m.title}</h3>
                  </div>

                  <div className={`pm-outcomes ${hasOverflow ? "pm-scroll" : ""}`}>
                    {sortedOutcomes.map((o) => {
                      const noPrice = o.bestAsk === null ? null : 1 - o.bestAsk;
                      const disabled = o.bestAsk === null;
                      return (
                        <div className="pm-outcome-row" key={o.outcomeId}>
                          <div className="pm-outcome-head">
                            <span className="pm-outcome-name">{o.outcomeLabel}</span>
                            <span className={`pm-outcome-pct ${disabled ? "muted" : ""}`}>
                              {formatPct(o.bestAsk)}
                            </span>
                          </div>
                          <div className="pm-buy-row">
                            <button
                              type="button"
                              className="pm-buy-btn pm-buy-yes"
                              disabled={disabled}
                              onClick={(e) => e.preventDefault()}
                            >
                              <span>Yes</span>
                              <span className="cents">{formatCents(o.bestAsk)}</span>
                            </button>
                            <button
                              type="button"
                              className="pm-buy-btn pm-buy-no"
                              disabled={disabled}
                              onClick={(e) => e.preventDefault()}
                            >
                              <span>No</span>
                              <span className="cents">{formatCents(noPrice)}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pm-card-footer">
                    <span>
                      <strong>{formatUsd(m.volume24h)}</strong> Vol
                    </span>
                    <span className="meta-dot" />
                    <span>{new Date(m.endDate).toLocaleDateString()}</span>
                    <span className="venues">
                      {m.venues.map((v) => (
                        <span key={v} className="badge">{VENUE_LABELS[v]}</span>
                      ))}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import type { MarketStatus, Venue } from "@vibeahack/shared";
import { ALL_VENUES } from "@vibeahack/shared";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useEvents } from "../api/hooks.js";

const VENUE_LABELS: Record<Venue, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  myriad: "Myriad",
};

const STATUS_CHOICES: Array<{ label: string; value: MarketStatus | undefined }> = [
  { label: "Active", value: "open" },
  { label: "Resolved", value: "resolved" },
  { label: "All", value: undefined },
];

type SortField = "volume24h" | "liquidity" | "endDate";
type SortOrder = "asc" | "desc";

type SortFieldChoice = {
  label: string;
  value: SortField;
  defaultOrder: SortOrder;
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
    label: "Liquidity",
    value: "liquidity",
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

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

function SortIcon() {
  return (
    <svg className="lead" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M5 3v10m0 0l-3-3m3 3l3-3M11 13V3m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SortDirIcon({ order }: { order: SortOrder }) {
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

function VenueIcon() {
  return (
    <svg className="lead" width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 6l5-3 5 3v7H3V6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 13v-3h2v3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
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

export function Events() {
  const [status, setStatus] = useState<MarketStatus | undefined>("open");
  const [venue, setVenue] = useState<Venue | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("volume24h");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const sortFieldChoice =
    SORT_FIELDS.find((c) => c.value === sortField) ?? SORT_FIELDS[0]!;

  const handleSortFieldChange = (value: SortField) => {
    const next = SORT_FIELDS.find((c) => c.value === value) ?? SORT_FIELDS[0]!;
    setSortField(next.value);
    setSortOrder(next.defaultOrder);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const filter = {
    ...(status ? { status } : {}),
    ...(venue ? { venue } : {}),
  };
  const { data, isLoading, error } = useEvents(filter);

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const e of data.items) set.add(e.category);
    return Array.from(set).sort();
  }, [data]);

  const visibleItems = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const filtered = data.items.filter((e) => {
      if (category && e.category !== category) return false;
      if (q && !e.title.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortOrder === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      switch (sortField) {
        case "volume24h":
          return (a.volume24h - b.volume24h) * dir;
        case "liquidity":
          return (a.liquidity - b.liquidity) * dir;
        case "endDate":
          return (
            (new Date(a.endDate).getTime() - new Date(b.endDate).getTime()) *
            dir
          );
      }
    });
    return sorted;
  }, [data, category, search, sortField, sortOrder]);

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
            placeholder="Search events..."
          />
        </div>
      </div>

      <div className="pm-controls-row">
        <label className="pm-pill-select">
          <SortIcon />
          <select
            value={sortField}
            onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
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
            <option value="">All venues</option>
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

      {isLoading && <div className="loading">Loading events…</div>}
      {error && <div className="error">Failed to load: {String(error)}</div>}

      {data && visibleItems.length === 0 && (
        <div className="pm-empty">
          <TrendingIcon />
          <h3 className="pm-empty-title">No events found</h3>
          <p className="pm-empty-sub">
            Try adjusting the filters or clearing your search
          </p>
        </div>
      )}

      {data && visibleItems.length > 0 && (
        <div className="pm-grid">
          {visibleItems.map((e) => {
            const isSingleBinary = !e.mutuallyExclusive && e.childMarketCount === 1;
            const topRow = e.topOutcomes[0];
            const hasOverflow = e.topOutcomes.length > 4;
            return (
              <Link
                to={`/events/${encodeURIComponent(e.id)}`}
                key={e.id}
                style={{ color: "inherit", textDecoration: "none", display: "block" }}
              >
                <div className="pm-card">
                  <div className="pm-card-top">
                    <div className="pm-icon">
                      {e.image ? (
                        <img
                          src={e.image}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                        />
                      ) : (
                        iconInitial(e.title)
                      )}
                    </div>
                    <h3 className="pm-title">{e.title}</h3>
                  </div>

                  {/* Single-binary events render like market cards: Yes/No pair for the only child. */}
                  {isSingleBinary && topRow && (
                    <div className="pm-outcomes">
                      <div className="pm-outcome-row">
                        <div className="pm-outcome-head">
                          <span className="pm-outcome-name">Yes</span>
                          <span className={`pm-outcome-pct ${topRow.bestAsk === null ? "muted" : ""}`}>
                            {formatPct(topRow.bestAsk)}
                          </span>
                        </div>
                        <div className="pm-buy-row">
                          <button
                            type="button"
                            className="pm-buy-btn pm-buy-yes"
                            disabled={topRow.bestAsk === null}
                            onClick={(ev) => ev.preventDefault()}
                          >
                            <span>Yes</span>
                            <span className="cents">{formatCents(topRow.bestAsk)}</span>
                          </button>
                          <button
                            type="button"
                            className="pm-buy-btn pm-buy-no"
                            disabled={topRow.bestAsk === null}
                            onClick={(ev) => ev.preventDefault()}
                          >
                            <span>No</span>
                            <span className="cents">
                              {formatCents(topRow.bestAsk === null ? null : 1 - topRow.bestAsk)}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Multi-outcome: leaderboard of top rows. */}
                  {!isSingleBinary && (
                    <div className={`pm-outcomes ${hasOverflow ? "pm-scroll" : ""}`}>
                      {e.topOutcomes.map((row) => (
                        <div className="pm-outcome-row" key={row.childMarketId}>
                          <div className="pm-outcome-head">
                            <span className="pm-outcome-name">{row.label}</span>
                            <span className={`pm-outcome-pct ${row.bestAsk === null ? "muted" : ""}`}>
                              {formatPct(row.bestAsk)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {e.childMarketCount > e.topOutcomes.length && (
                        <div className="pm-outcome-row" style={{ opacity: 0.6 }}>
                          <div className="pm-outcome-head">
                            <span className="pm-outcome-name">
                              +{e.childMarketCount - e.topOutcomes.length} more…
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pm-card-footer">
                    <span>
                      <strong>{formatUsd(e.volume24h)}</strong> Vol
                    </span>
                    <span className="meta-dot" />
                    <span>{new Date(e.endDate).toLocaleDateString()}</span>
                    <span className="venues">
                      {e.venues.map((v) => (
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

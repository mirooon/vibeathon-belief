import {
  BeliefRouteResponseSchema,
  BeliefSearchResponseSchema,
  EventDetailSchema,
  EventListResponseSchema,
  HealthResponseSchema,
  MarketDetailSchema,
  MarketListResponseSchema,
  QuoteResponseSchema,
  type BeliefRouteRequestInput,
  type BeliefRouteResponse,
  type BeliefSearchRequestInput,
  type BeliefSearchResponse,
  type EventDetail,
  type EventListResponse,
  type HealthResponse,
  type MarketDetail,
  type MarketListResponse,
  type MarketSortField,
  type MarketSortOrder,
  type MarketStatus,
  type QuoteRequest,
  type QuoteResponse,
  type Venue,
} from "@vibeahack/shared";

export interface MarketsFilter {
  status?: MarketStatus;
  venues?: Venue[];
  sortBy?: MarketSortField;
  sortOrder?: MarketSortOrder;
}

export interface EventsFilter {
  status?: MarketStatus;
  venue?: Venue;
  featured?: boolean;
}

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:3000/api/v1";

async function handle<T>(
  res: Response,
  parser: (raw: unknown) => T,
): Promise<T> {
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({
      error: { code: "HTTP_ERROR", message: `${res.status} ${res.statusText}` },
    }));
    const error = (body as { error?: { code?: string; message?: string } }).error;
    throw new Error(
      `${error?.code ?? "HTTP_ERROR"}: ${error?.message ?? res.statusText}`,
    );
  }
  return parser(await res.json());
}

export const api = {
  listMarkets(filter?: MarketsFilter): Promise<MarketListResponse> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.venues) {
      for (const v of filter.venues) params.append("venue", v);
    }
    if (filter?.sortBy) params.set("sortBy", filter.sortBy);
    if (filter?.sortOrder) params.set("sortOrder", filter.sortOrder);
    const qs = params.toString();
    return fetch(`${API_URL}/markets${qs ? `?${qs}` : ""}`).then((r) =>
      handle(r, (raw) => MarketListResponseSchema.parse(raw)),
    );
  },

  getMarket(id: string): Promise<MarketDetail> {
    return fetch(`${API_URL}/markets/${encodeURIComponent(id)}`).then((r) =>
      handle(r, (raw) => MarketDetailSchema.parse(raw)),
    );
  },

  getQuote(id: string, req: QuoteRequest): Promise<QuoteResponse> {
    return fetch(`${API_URL}/markets/${encodeURIComponent(id)}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => handle(r, (raw) => QuoteResponseSchema.parse(raw)));
  },

  getHealth(): Promise<HealthResponse> {
    return fetch(`${API_URL}/health`).then((r) =>
      handle(r, (raw) => HealthResponseSchema.parse(raw)),
    );
  },

  searchBelief(req: BeliefSearchRequestInput): Promise<BeliefSearchResponse> {
    return fetch(`${API_URL}/belief/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => handle(r, (raw) => BeliefSearchResponseSchema.parse(raw)));
  },

  routeBelief(req: BeliefRouteRequestInput): Promise<BeliefRouteResponse> {
    return fetch(`${API_URL}/belief/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => handle(r, (raw) => BeliefRouteResponseSchema.parse(raw)));
  },

  listEvents(filter?: EventsFilter): Promise<EventListResponse> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.venue) params.set("venue", filter.venue);
    if (filter?.featured !== undefined) {
      params.set("featured", filter.featured ? "true" : "false");
    }
    const qs = params.toString();
    return fetch(`${API_URL}/events${qs ? `?${qs}` : ""}`).then((r) =>
      handle(r, (raw) => EventListResponseSchema.parse(raw)),
    );
  },

  getEvent(id: string): Promise<EventDetail> {
    return fetch(`${API_URL}/events/${encodeURIComponent(id)}`).then((r) =>
      handle(r, (raw) => EventDetailSchema.parse(raw)),
    );
  },
};

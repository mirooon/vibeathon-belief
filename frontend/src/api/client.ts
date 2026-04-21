import {
  BeliefSearchResponseSchema,
  HealthResponseSchema,
  MarketDetailSchema,
  MarketListResponseSchema,
  QuoteResponseSchema,
  type BeliefSearchRequest,
  type BeliefSearchResponse,
  type HealthResponse,
  type MarketDetail,
  type MarketListResponse,
  type MarketStatus,
  type QuoteRequest,
  type QuoteResponse,
} from "@vibeahack/shared";

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
  listMarkets(filter?: { status?: MarketStatus }): Promise<MarketListResponse> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
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

  searchBelief(req: BeliefSearchRequest): Promise<BeliefSearchResponse> {
    return fetch(`${API_URL}/belief/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }).then((r) => handle(r, (raw) => BeliefSearchResponseSchema.parse(raw)));
  },
};

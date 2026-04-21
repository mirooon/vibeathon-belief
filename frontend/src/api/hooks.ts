import { useQuery } from "@tanstack/react-query";
import type { QuoteRequest } from "@vibeahack/shared";
import { api, type EventsFilter, type MarketsFilter } from "./client.js";

export function useBeliefSearch(belief: string) {
  return useQuery({
    queryKey: ["belief", belief],
    queryFn: () => api.searchBelief({ belief, limit: 5 }),
    enabled: belief.trim().length >= 3,
    staleTime: 30_000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.getHealth(),
    refetchInterval: 15_000,
    retry: false,
  });
}

export function useMarkets(filter?: MarketsFilter) {
  const venuesKey = filter?.venues ? [...filter.venues].sort().join(",") : "all";
  return useQuery({
    queryKey: [
      "markets",
      filter?.status ?? "all",
      venuesKey,
      filter?.sortBy ?? "endDate",
      filter?.sortOrder ?? "default",
    ],
    queryFn: () => api.listMarkets(filter),
  });
}

export function useMarket(id: string | undefined) {
  return useQuery({
    queryKey: ["market", id],
    queryFn: () => api.getMarket(id as string),
    enabled: Boolean(id),
  });
}

export function useQuote(
  id: string | undefined,
  req: QuoteRequest | null,
) {
  return useQuery({
    queryKey: ["quote", id, req?.outcomeId, req?.side, req?.size],
    queryFn: () => api.getQuote(id as string, req as QuoteRequest),
    enabled: Boolean(id && req && req.outcomeId && req.size > 0),
    staleTime: 5_000,
  });
}

export function useEvents(filter?: EventsFilter) {
  return useQuery({
    queryKey: [
      "events",
      filter?.status ?? "open",
      filter?.venue ?? "all",
      filter?.featured ?? "all",
    ],
    queryFn: () => api.listEvents(filter),
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => api.getEvent(id as string),
    enabled: Boolean(id),
  });
}

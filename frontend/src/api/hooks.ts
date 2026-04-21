import { useQuery } from "@tanstack/react-query";
import type { QuoteRequest } from "@vibeahack/shared";
import { api, type MarketsFilter } from "./client.js";

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

import type { QuoteRoute, Venue, VenueBreakdown } from "@vibeahack/shared";

const VENUE_LABEL: Record<string, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  myriad: "Myriad",
};

/**
 * Resolves a public `tradingUrl` for the CTA.
 *
 * 1. When a quote route is selected, prefer the first split’s venue and the
 *    matching `venueBreakdown` row (aligns with quote execution order).
 * 2. If there is no split yet (quote still loading or empty), or that venue has no
 *    URL, use the first breakdown row with a `tradingUrl`. That field is set on
 *    `venue_markets` at seed time or by the market-sync worker, not by `POST /quote`.
 */
export function tradingUrlForSelectedRoute(
  selectedRoute: QuoteRoute | undefined,
  venueBreakdown: VenueBreakdown[],
): { url: string; venue: Venue; label: string } | null {
  const first = selectedRoute?.splits[0];
  if (first) {
    const row = venueBreakdown.find((b) => b.venue === first.venue);
    const url = row?.tradingUrl;
    if (typeof url === "string" && url.length) {
      return {
        url,
        venue: first.venue,
        label: VENUE_LABEL[first.venue] ?? first.venue,
      };
    }
  }

  const withUrl = venueBreakdown.find(
    (b) => typeof b.tradingUrl === "string" && b.tradingUrl.length > 0,
  );
  if (withUrl) {
    return {
      url: withUrl.tradingUrl!,
      venue: withUrl.venue,
      label: VENUE_LABEL[withUrl.venue] ?? withUrl.venue,
    };
  }
  return null;
}

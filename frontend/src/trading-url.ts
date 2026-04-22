import type { QuoteRoute, Venue, VenueBreakdown } from "@vibeahack/shared";

const VENUE_LABEL: Record<string, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
  myriad: "Myriad",
};

/**
 * Resolves a public `tradingUrl` for the first venue in the selected route
 * (quote-engine execution order), using the first matching `venueBreakdown` row
 * for that venue.
 */
export function tradingUrlForSelectedRoute(
  selectedRoute: QuoteRoute | undefined,
  venueBreakdown: VenueBreakdown[],
): { url: string; venue: Venue; label: string } | null {
  const first = selectedRoute?.splits[0];
  if (!first) return null;
  const row = venueBreakdown.find((b) => b.venue === first.venue);
  const url = row?.tradingUrl;
  if (typeof url !== "string" || !url.length) return null;
  return {
    url,
    venue: first.venue,
    label: VENUE_LABEL[first.venue] ?? first.venue,
  };
}

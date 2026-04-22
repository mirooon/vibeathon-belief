/**
 * Deterministic text used for local embedding (MiniLM). Sourced from logical
 * market documents — no per-id hand-authored strings.
 */
export const MAX_BELIEF_TEXT_LENGTH = 2_000;

export interface BeliefTextMarketInput {
  title: string;
  category: string;
  eventTitle?: string;
  groupItemTitle?: string;
}

/**
 * L2 length cap — MiniLM is ~512 subword units; 2k chars is a safe upper bound.
 */
export function truncateForEmbedding(
  s: string,
  max: number = MAX_BELIEF_TEXT_LENGTH,
): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

/**
 * Composes a single line: event, row label, question, category. Order matters
 * for Polymarket “event with many child rows” (groupItemTitle = team, etc.).
 */
function composeMarketText(input: BeliefTextMarketInput): string {
  const parts = [input.eventTitle, input.groupItemTitle, input.title, input.category]
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter((p) => p.length > 0);
  return parts.join(" — ");
}

/**
 * Per-market string for /belief/search ranking.
 */
export function buildSearchableMarketText(input: BeliefTextMarketInput): string {
  const raw = composeMarketText(input) || input.title;
  return truncateForEmbedding(raw);
}

/**
 * Per (market, outcome) string — retained for non-binary outcomes where
 * /belief/route falls back to per-outcome embedding scoring. Binary Yes/No
 * markets use a polarity heuristic in belief.service and do not rely on this.
 */
export function buildSearchableOutcomeText(
  market: BeliefTextMarketInput,
  outcome: { id: string; label: string },
): string {
  const base = composeMarketText(market) || market.title;
  const label = String(outcome.label).trim() || outcome.id;
  return truncateForEmbedding(
    `${base} — Outcome: ${label}`,
  );
}

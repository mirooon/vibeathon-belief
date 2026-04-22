import {
  buildSearchableMarketText,
  buildSearchableOutcomeText,
  MAX_BELIEF_TEXT_LENGTH,
  truncateForEmbedding,
} from "./belief-text.js";

describe("belief-text", () => {
  it("composes event, group, title, category for search", () => {
    const s = buildSearchableMarketText({
      eventTitle: "2026 FIFA World Cup Winner",
      groupItemTitle: "France",
      title: "Will France win the 2026 FIFA World Cup?",
      category: "sports",
    });
    expect(s).toContain("FIFA");
    expect(s).toContain("France");
  });

  it("falls back to title when other fields empty", () => {
    const s = buildSearchableMarketText({
      title: "Bitcoin above 100k in 2026",
      category: "crypto",
    });
    expect(s).toMatch(/100k|2026/);
  });

  it("embeds market context in outcome string for generic labels", () => {
    const o = buildSearchableOutcomeText(
      {
        eventTitle: "Tournament",
        groupItemTitle: "France",
        title: "Win?",
        category: "sports",
      },
      { id: "x", label: "Yes" },
    );
    expect(o).toContain("France");
    expect(o).toContain("Yes");
  });

  it("truncates very long strings", () => {
    const long = "x".repeat(MAX_BELIEF_TEXT_LENGTH + 500);
    const t = truncateForEmbedding(long);
    expect(t.length).toBe(MAX_BELIEF_TEXT_LENGTH);
  });
});

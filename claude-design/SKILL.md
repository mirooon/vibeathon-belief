---
name: lifi-design
description: Use this skill to generate well-branded interfaces and assets for LI.FI (and its consumer app Jumper), either for production or throwaway prototypes/mocks/decks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping across the LI.FI marketing surface and the Jumper app.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files — `colors_and_type.css`, `assets/` (logos), `preview/` (design system cards), and `ui_kits/marketing/` + `ui_kits/jumper/` (reference recreations).

Key rules:
- Always write the brand as **LI.FI** (all caps). Never "Li.Fi" or "lifi". Pronounced *lee-fye*, short for *linked finance*.
- The consumer app is **Jumper** (jumper.exchange), powered by LI.FI.
- Core colors: Pink `#F7C2FF`, Blue `#5C67FF` — used sparingly as accents on a near-black canvas, often as a 135° pink→blue gradient on hero words and primary CTAs.
- Signature eyebrow motif: `//snake_case_tags` (e.g. `//by_the_numbers`, `//for_developers`) in mono type with a pink `//` prefix.
- Dark-first surfaces: `#000` page → `#0A0A0B` section → `#1A1A1D` card. Borders do the separating; shadows are rare outside colored glows.
- No emoji. No hand-drawn illustrations. No exclamation marks in product copy. Sentence case everywhere except the wordmark and small label pills.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of this folder and create static HTML files for the user to view. Import `colors_and_type.css` for tokens. If working on production code, read the rules here to become an expert in designing with the LI.FI brand.

If the user invokes this skill without any other guidance, ask them:
1. Which surface — marketing page, Jumper in-product screen, partner/pitch deck, or something new?
2. Any specific product/feature in focus (API/SDK, Widget, Composer, Deposit, Earn, Stablecoin API, Loyalty Pass)?
3. How many variations would they like, and along what dimension (layout, copy tone, color emphasis)?

Then act as an expert designer who outputs HTML artifacts or production code, depending on the need.

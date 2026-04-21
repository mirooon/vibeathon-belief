# LI.FI Design System

A design system for **LI.FI** and its consumer surface **Jumper** — the leading cross-chain liquidity aggregator and its everything-exchange frontend.

> **Name rules.** Always write the brand in all caps: **LI.FI** (not *Li.Fi* or *lifi*). Pronounced *lee-fye*. Short for *linked finance*. The consumer app is **Jumper** (or *Jumper Exchange* / *jumper.exchange*), "powered by LI.FI".

---

## About LI.FI

LI.FI is a **cross-chain liquidity aggregation and orchestration protocol** — an API/SDK/Widget that aggregates every major DEX aggregator (Uniswap, 1inch, 0x, Odos…) and bridge (Stargate, Across, Mayan…) into a single integration across 60+ chains. Developers plug in once; LI.FI routes each swap/bridge to the optimal path.

**Products represented in this system:**

| Surface | What it is | Primary audience |
|---|---|---|
| `li.fi` marketing site | Dev/enterprise storefront — API/SDK, Widget, Composer, Deposit, Earn, Stablecoin API | Builders, protocol teams, enterprise |
| **Jumper** (`jumper.exchange`) | Consumer "everything exchange" built on top of LI.FI — swap, bridge, onramp, earn, loyalty pass | End users, DeFi power users |
| Partner Portal / LI.FI Scan | Internal dashboards (monitoring, analytics) | Integrators |

The two core surfaces captured in UI kits here are **the marketing site** and **Jumper**. Partner Portal + Scan follow the same dark panel language as Jumper.

---

## Sources consulted

- **Official brand page:** https://li.fi/brand-guidelines/ — logos + core colors
- **Marketing site:** https://li.fi/ — tone, layout, `//eyebrow_tags`
- **Jumper:** https://jumper.exchange/ — dark consumer UI (reconstructed — no codebase import provided; see "Caveats" below)
- **Knowledge Hub / Docs snippets:** https://li.fi/knowledge-hub/, https://docs.li.fi/ — product copy & positioning
- **Uploaded logos:** `uploads/logo_lifi_{dark,light}{,_horizontal,_vertical}.svg` (copied into `assets/`)
- **Download bundle referenced:** https://li.fi/LI.FI_Logos.zip (not pulled; the 6 SVGs uploaded cover all listed lockups)

---

## Index — what's in this folder

```
README.md                    ← you are here
SKILL.md                     ← Agent Skill shim (for Claude Code)
colors_and_type.css          ← single source of truth for color + type tokens
assets/                      ← logos + brand marks (SVG)
preview/                     ← Design System tab cards (palette, type, etc.)
ui_kits/
  marketing/                 ← li.fi-style marketing site recreation
    index.html
    README.md
    *.jsx
  jumper/                    ← Jumper app recreation (swap widget, header, wallet, routes)
    index.html
    README.md
    *.jsx
```

---

## CONTENT FUNDAMENTALS

**Voice**: confident, technical, infrastructure-maximalist — speaks to developers and protocol teams but in clear product-marketing English. Never folksy. Never over-explains crypto. Assumes the reader knows what a bridge, DEX, chain, intent, solver is.

**Copy patterns observed:**

- **Section eyebrows use `//snake_case_tags`** — `//by_the_numbers`, `//any_chain`, `//for_developers`, `//for_enterprise`, `//partners`. This is the strongest verbal-visual motif on the marketing site. Treat it as a brand primitive.
- **Hero headlines are one declarative sentence.** e.g. *"Universal market access for digital assets."* · *"Swap and move any crypto asset across any blockchain ecosystem."* Tight, no adjective stacking.
- **Subheads are benefit-led, benchmark-heavy.** Always surface numbers: *"$80B+ Total Transfer Volume"*, *"100M+ Total Transfers"*, *"60+ chains"*, *"20+ bridges"*, *"1000+ partners trust LI.FI"*. Stats replace rhetoric.
- **Pronouns**: "we" / "our" when LI.FI speaks about itself; "you" when addressing builders. Never "I".
- **Case**: Sentence case for headlines, body, and buttons. UPPERCASE reserved for the wordmark (*LI.FI*) and tiny label pills (*SELF-CUSTODY WALLET*, *FREE TO INTEGRATE*).
- **CTAs are verbs**: *Start your integration* · *Contact sales* · *Get started* · *Try it now* · *Sign in to Partner Portal*.
- **Jumper copy is lighter**: *"Jumper is crypto's everything exchange."* Playful product names ("Loyalty Pass", "Jumper", "Earn") but the tone stays factual.
- **No emoji.** Never observed in product or marketing copy. Status uses colored dots + text.
- **No exclamation points** in product copy. Occasional in Knowledge Hub blog posts.
- **Quote attributions** always show role + company — builds the enterprise-credibility impression.

**Specific examples to pattern-match against:**

> //by_the_numbers — *1000+ partners trust LI.FI*
> *Go to market faster. No integration and maintenance overhead.*

> //for_developers — *Build smarter with a single API solution*
> *Simplify your crypto journey with one powerful API.*

> (Jumper) — *4x audited multi-chain liquidity aggregator powered by LI.FI*

---

## VISUAL FOUNDATIONS

**Mood**: dark, precise, infra-grade. Not "crypto maximalist neon". Pink & blue are used sparingly as accents against pure-black canvas — the effect is closer to a premium dev tool (Linear / Vercel) than a consumer fintech app.

### Color
- **Dark-first.** Pages default to pure black (`#000`) or near-black (`#0A0A0B`). Cards/panels step up through `#121214 → #1A1A1D → #1F1F23`.
- **Two brand accents:** Pink `#F7C2FF` and Blue `#5C67FF` from the brand guidelines. Use them (a) as a **135° diagonal gradient** (pink→blue) for hero words, logos on imagery, key stat numbers; (b) as **single-accent highlights** (pink for marketing, blue for interactive/primary actions in-product); (c) as **soft glow** behind focal CTAs.
- **Text on black:** `#F4F4F5` primary, `#B4B4BD` secondary, `#8A8A94` tertiary. Never pure white on pure black for body copy — the `#F4F4F5` softens edge vibration.
- **Status colors exist but are muted** — green `#34D399` for success/positive price impact, yellow `#FBBF24` for slippage warnings, red `#F87171` for errors.

### Type
- Primary family: a **neo-grotesque sans**. LI.FI appears to ship a Söhne-like display family; the Jumper widget uses **Inter**. We standardize on **Inter** as the substitute with a fallback chain to Söhne / Neue Haas Grotesk Display. **FLAG → if you have the licensed display font, drop it into `fonts/` and update `--font-display`.**
- Mono: **JetBrains Mono** (standing in for Söhne Mono) — used for `//eyebrows`, code, stat values, chain/token addresses.
- Display weight is **500 (medium)**, not 700. Headlines feel refined, not shouty. Tight tracking (`-0.03em`) on big type.
- Numbers are **mono-tabular** when shown in stats/price — prevents jitter as values animate.

### Spacing & layout
- 4px base grid (tokens 4–128px). Marketing sections use generous 96–128px vertical rhythm; product UI (Jumper) is tighter at 16–24px.
- **Max content width** ~1280px on marketing, centered, with clear ambient space left/right.
- Fixed elements: sticky top nav on marketing, persistent side rail on Jumper (wallet + chain selector), bottom status bar with route quote refresh countdown.

### Backgrounds
- Pure flat black dominates. No full-bleed hero photography.
- One signature treatment: **subtle radial glow** (pink and/or blue) in the top-center of hero sections, blurred ~200px. Low opacity (~20%). Never saturates.
- **No hand-drawn illustrations.** No photography of people. Occasional chain logos arranged as an orbital halo / grid (Ethereum, Solana, Arbitrum, Base…).
- No repeating patterns or textures. Occasional 1px dotted or dashed guide line in muted `#26262A`.
- **Grain: never.**

### Imagery vibe
When imagery appears it is chain logos (solid, monochrome white or brand-color tinted), partner logos (monochrome white at ~60% opacity), product screenshots on angled cards. Tone is **cool**, high-contrast, no warmth.

### Corner radii
- Buttons: `8px` (`--r-sm`)
- Inputs + small cards: `12px` (`--r-md`)
- Cards: `16px` (`--r-lg`)
- Widget / major panels: `24px` (`--r-xl`)
- Pills / chain chips / status tags: `999px` (`--r-pill`)

### Cards
Flat near-black surface (`--bg-card`, `#1A1A1D`), **1px border** in `--border-subtle` (`#26262A`), `--r-lg` radius, **no drop shadow** by default. On hover: border lifts to `--border-default` and a subtle pink or blue glow appears behind it (`--shadow-glow-pink` / `--shadow-glow-blue`). Never stacked box-shadows.

### Borders
Borders are **the** separator — shadows are rare outside of elevated tooltips/menus. Default `1px solid #3A3A40`; subtle `#26262A`; strong `#5A5A63`.

### Inner/outer shadows
- Outer: small tooltip/menu shadow `0 4px 16px rgba(0,0,0,.35)`; large modal shadow `0 24px 80px rgba(0,0,0,.55)`.
- Colored glows replace "brand shadows" — `0 0 40px rgba(247,194,255,0.25)` (pink) or `0 0 40px rgba(92,103,255,0.35)` (blue).
- Inner shadows: none observed.

### Transparency & blur
Used narrowly: (1) the sticky marketing nav gets `backdrop-filter: blur(20px)` over `rgba(0,0,0,0.6)`; (2) modal overlays dim the page with `rgba(0,0,0,0.7)` + `blur(8px)`; (3) the pink/blue glow halos use low-alpha gradients with no hard blur. Otherwise surfaces are opaque.

### Animation
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)` for standard, `cubic-bezier(0.16, 1, 0.3, 1)` (out-soft) for entrances.
- Duration: 120ms (fast — hovers), 200ms (base — menus, toggles), 400ms (slow — modal enter/exit).
- **Fades + subtle translates** dominate; no bounces, no springs. Number counters tick up on scroll-into-view.
- Logo marquees (partner rails, chain rails) scroll linearly, infinitely. Pause on hover.

### Hover / press states
- **Buttons — primary (white):** background shifts `#FFFFFF → #D8D8DC` on hover; text stays black. Press: subtract 2% brightness, no scale.
- **Buttons — secondary (outlined):** border goes `--border-default → --accent` (pink for marketing, blue for Jumper); background tints to 8% accent.
- **Links / nav items:** `color` fades from `--fg-2 → --fg-1` over 120ms.
- **Cards:** border brightens + faint accent glow appears behind.
- **Press shrink: none.** Subtle opacity drop only.

### Protection gradients vs capsules
Labels that sit over varying backgrounds use **capsules** (pill-shaped, solid-fill, `--bg-panel` or `rgba(255,255,255,0.08)`). Gradients-as-background-protection are **not** used.

### Layout rules (fixed elements)
- Top nav: sticky, blur, pure black with 60% alpha, 72px tall on marketing, 64px on Jumper.
- Jumper swap widget: centered, 480px wide, locked to viewport center on desktop; full-width on mobile.
- Bottom toasts: stack bottom-right, 16px gutter, auto-dismiss 4s.

---

## ICONOGRAPHY

**Approach**: thin-to-medium stroke, 1.5–2px weight, 24px base size, rounded line caps, outline style (not filled). No duotone. Monochrome — inherits `currentColor` — except chain/token logos which keep their native brand colors.

**Sources observed:**
- The LI.FI/Jumper widget and marketing site appear to use **Material Symbols** (Google) for UI chrome (settings, swap arrows, info, close) — thin outlined weight. There is no bespoke LI.FI icon font we can extract publicly.
- **Chain logos and token logos** are fetched per-chain from their own SVG sources (the ecosystem convention — logos for ETH, SOL, ARB, OP, BASE, AVAX, etc.). Jumper fetches them from a TokenList registry at runtime.

**Recommendation / substitution:**
- **For general UI icons** (swap, arrow, menu, info, close, search, settings, chevron, external-link): use **[Lucide](https://lucide.dev/)** via CDN — stroke style, 24px, 1.5px stroke matches the LI.FI feel very closely. **FLAG → this is a close substitution; the real product may be on Material Symbols Outlined.** If the user has the production icon set, drop SVGs into `assets/icons/` and update `ui_kits/*/index.html`.
- **For chain / token icons:** placeholder with a solid circle + 1–2 letter glyph in Inter Medium, colored to match the chain (ETH neutral, SOL gradient, ARB cyan, BASE blue, OP red, AVAX red, POLY purple, BNB yellow). Mark clearly in the kit with a `data-placeholder="true"` attribute so they're easy to swap for real logos later.

**Emoji**: never used in product. Do not add.

**Unicode characters** used as glyphs: `→` for CTAs ("Trading widget →"), `//` as the eyebrow prefix, `×` for close, `↑ ↓` for price movement. Use these directly — no SVG equivalent needed.

**Logos on hand** (`assets/`): horizontal, vertical, and icon-only, each in light (black marks) and dark (white marks). Rule from brand guidelines: **the wordmark should never appear without the icon; the icon may appear alone when space is tight.**

---

## Caveats + what I'm unsure about — please confirm

1. **No codebase was attached.** Jumper is open-source (`github.com/lifinance/widget` and `github.com/lifinance/jumper`) — if you can import that repo, the Jumper UI kit will become pixel-perfect instead of my reconstruction from the live site + screenshots.
2. **Display font is substituted.** `Inter` is used as the stand-in. If LI.FI has a licensed display family (Söhne / Neue Haas Grotesk / in-house), drop the `.woff2` files into `fonts/` and update `--font-display` in `colors_and_type.css`.
3. **Icon set is substituted.** Lucide CDN in place of (likely) Material Symbols Outlined. Swap if you have the production set.
4. **Chain/token logos are placeholder** circles. Drop real SVGs into `assets/chains/` and `assets/tokens/` — I've namespaced the paths for you.
5. **Only the two main surfaces** (marketing site + Jumper) have UI kits. Partner Portal and LI.FI Scan would each deserve their own kit — say the word if you want either added.

**Ask from me → please confirm the font family, icon set, and whether the Jumper repo can be imported; I'll iterate.**

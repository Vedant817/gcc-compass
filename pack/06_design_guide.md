# 06 Design guide

Goal: it should look like a research tool an analyst built by hand, and match the deck (`Vedant_Mahajan_GCC_Compass_Flexiple.pptx`). Think a Financial Times data page or a consulting appendix. It should not look like a SaaS landing page.

## Palette (taken from the deck's XML)
| Token | Hex | Use |
|---|---|---|
| `ink` | `#304359` | primary text on light, top bar, primary buttons, chart bars (primary) |
| `slate` | `#415977` | secondary headings, active nav, secondary bars |
| `slate-light` | `#778DA9` | muted bars (e.g. "centres" vs "companies"), borders on focus |
| `sand` | `#F1CF9D` | the ONE accent: highlight the user's chosen city row, key number underline, selected chip. Use sparingly (≤5% of the screen) |
| `paper` | `#F7F7F7` | page background (off-white) |
| `rule` | `#E9ECEF` | table rules, card borders, zebra rows |
| `muted` | `#6C757D` | captions, source lines, timestamps |
| `white` | `#FFFFFF` | cards/table surfaces |
Status colours (muted, never neon): eligible `#3F6B4F`, not eligible `#8A3B32`, needs check `#8C6A2E` on `#F6EEDC`. Confidence badges: H = ink outline, M = slate outline, L = muted dashed outline + "Low".

## Typography
- Headings: **Source Serif 4** (Google Fonts) 600, sizes 28/22/18; small serif headings, not giant hero type.
- Body/UI: **Jost** (matches the deck) or **Inter** 400/500, 14-15 px; tables 13 px with `font-variant-numeric: tabular-nums`.
- Source lines: 12 px, `muted`, prefixed "Source:".
- Numbers in Indian format: `₹1,23,456`, `₹44.7 Cr`, `₹62.6 L`. Use `Intl.NumberFormat('en-IN')`.

## Layout
- Max width 1200 px, 24 px gutters, 8 px spacing grid. Left-aligned content.
- Top bar: ink background, white serif wordmark "GCC Compass", nav links in Jost 14, active = sand underline 2 px.
- Pages open with an H1 plus one plain sentence saying what the page answers (e.g. "Every published answer to one question, side by side.").
- Dense tables over cards. Cards only for eligibility results and plan sections; 1 px `rule` border, 4 px radius, **no shadows** (or `0 1px 0 rule` at most).
- Navigator: two columns on desktop (inputs 360 px sticky left, results right).
- Charts: Recharts, flat fills, no gradients, no animation beyond 150 ms, axis text `muted` 12 px, gridlines `rule`. Label bars directly; avoid legends where possible. Footnote source under every chart.

## Components (shadcn/ui, restyled)
Button (primary ink/white, secondary white with ink border, link style), Select, Input, RadioGroup, Checkbox, Slider (track `rule`, range `slate`, thumb ink), Table, Badge (confidence, status, "Our service", "[UNVERIFIED]", "AI-extracted · human-approved"), Tooltip/HoverCard for citation chips, Tabs (sparingly), Toast (bottom-left, plain).
Citation chip: `[f402]` mono 11 px, `rule` background, ink text; hover card shows publisher, date, value, link.

## Avoid (hard no)
- Purple/blue/pink gradients, glassmorphism, glow, neon, blurred blobs, mesh backgrounds.
- Emoji, sparkle icons (✨), robot icons, "AI-powered", "Unlock", "Supercharge", "Revolutionise", "Seamless".
- Giant centred hero with a CTA; testimonial carousels; fake logos; fake stats.
- Rounded-2xl cards with big shadows; everything centred; icon above every heading.
- Lorem ipsum or placeholder numbers. Default shadcn slate/zinc theme left untouched.
- Dark mode is not needed.

## Copy tone
Plain, specific, a little dry. Short sentences. Say what the number is and where it's from.
- Good: "Seven sources, 1,700 to 2,000+. Most of the gap is definitions." / "Not eligible: the TN scheme requires a Global 2000 company." / "We don't have a salary figure for Chennai, so we haven't ranked it."
- Bad: "Unlock powerful AI insights ✨" / "Our intelligent engine analyses thousands of data points".
Buttons are verbs: "Build my shortlist", "Extract facts", "Approve", "Save & export plan". Empty states tell the user what to do next. Use British/Indian spelling consistently (centre, programme) because the deck does.

## Small human touches
- Footer: "Built by Vedant Mahajan for the Flexiple Product Intern assignment, Oct 2026. Data as of the dates shown."
- "Method" page or modal (short): how confidence is assigned (H official policy/primary report, M reputable secondary, L single vendor/hedged), what "domain-level link" means, the scoring formula.
- Favicon: a simple ink square with a sand "G" or a compass tick mark. No gradient.

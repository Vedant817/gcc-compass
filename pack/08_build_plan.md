# 08 Build plan (~1 day, 8-9 focused hours)

Deadline for Vedant's submission: ~4:15 PM IST Tue 13 Oct 2026. Aim to have the deployed URL by **Mon 12 Oct evening IST** so there's time for screenshots and slide 11.

| # | Milestone | Time | Done when |
|---|---|---|---|
| M0 | Scaffold: Next.js + TS + Tailwind + shadcn, fonts (Source Serif 4, Jost/Inter), palette tokens in `tailwind.config`, top bar/footer, empty pages, deployed to Vercel | 45 min | Production URL loads all 5 nav pages with correct fonts/colours |
| M1 | Registry: copy `seed/`, `lib/types.ts` (zod), `lib/registry.ts`, validation test, `/api/registry`, `/method` page | 45 min | Validator passes; header shows "70 facts · 28 sources" |
| M2 | Truth table: metric presets, bar chart w/ ranges + shading for centres, fact table, badges, source links | 90 min | India shows 7 sources 1,700→2,000+; Bengaluru shows 487 / 875+ / ~950 |
| M3 | Scoring + rules + cost libs ported, unit tests green vs `expected_demo_output.json` | 75 min | `npm test` passes all 4 presets |
| M4 | Navigator UI: form, demo-load link, ranking table, sliders, not-enough-data list, eligibility cards, cost table, providers | 120 min | Demo persona result matches 04 on screen; sliders re-rank live |
| M5 | LLM client + Ask page + grounding + citation chips; "why they differ" on Truth table | 90 min | Maharashtra and Kolkata answers behave as in 05; invented-number test rejected |
| M6 | Add a source: extraction, quote check/highlight, edit/approve/reject, overlay persistence, "Recently added" | 60 min | Telangana sample → approve → visible after refresh, counts update |
| M7 | Plan page (URL-encoded), sources list, print CSS, lead form | 45 min | Shared link reopens identical plan; PDF prints cleanly on A4 |
| M8 | Polish, empty/error states, mobile check, README, screenshots, final production smoke test | 60 min | QA checklist below all ticked |

## Final QA checklist
- [ ] Every number on screen is either linked to a fact/source or labelled "Estimate" with assumptions.
- [ ] No averaged or "consensus" number anywhere.
- [ ] [UNVERIFIED] facts show the badge and Low confidence (Gurugram rent growth, Haryana policy, Tier-2 attrition gap, plus policy parts listed in `unverified_parts`).
- [ ] "site-level link" flag shown for `url_precision=domain_only` sources.
- [ ] Flexiple tagged "Our service", not pinned first, not favoured by scoring.
- [ ] Demo script in 02 runs end to end on the **production** URL in under 3 minutes, in a fresh incognito window.
- [ ] AI routes: grounded, cite ids, refuse outside data, handle errors.
- [ ] No emoji, gradients, glow, sparkle icons, "AI-powered" copy. Default shadcn theme replaced.
- [ ] Works at 1440 px and 390 px; keyboard focus visible.
- [ ] README (human voice, short): what it is, how truth works (fact = value + source + date + definition + confidence; conflicts shown), how the score works, where AI is used and how it's constrained, how to run locally, env vars, known limitations (seed size, domain-level links, CTC proxy), what's next.
- [ ] `.env` not committed; repo public.

## Screenshots for deck slide 11 (1440×900, browser chrome cropped, PNG)
1. `01_truth_table.png`: Truth table, "GCCs in India", centres toggle on, why-they-differ note visible.
2. `02_setup_wizard.png`: Navigator with demo persona loaded, ranking table + weight sliders (Lowest cost).
3. `03_eligibility_cost.png`: Eligibility cards (TN not eligible, KA only outside Bengaluru, MH needs check) + 3-year cost table.
4. `04_ask_registry.png`: Ask page with the Maharashtra answer and citation chips (one hover card open).
5. `05_add_source_export.png`: Add a source with Telangana extraction, quote highlighted, one row approved; or split with plan export page + CTA.

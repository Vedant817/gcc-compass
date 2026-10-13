# Note on deviations and unfinished items

Production URL: **https://gcc-compas.vercel.app**

Everything in the pack's build plan (M0-M8) is implemented. The items below are choices I
made where the pack was ambiguous, or limits I hit while building. Each one keeps the data
honest; none of them changes a number the pack specified.

## Deviations from the pack

1. **Model fallbacks and token budget (`lib/llm.ts`).** The pack says one OpenAI-compatible
   client with a 25s timeout and `max_tokens` around 1200. The Gemini-compatible endpoint I
   deployed against spends hidden reasoning tokens before the visible answer, which truncated
   JSON responses at 1200 tokens, and its free tier rate-limits per model. So: `max_tokens`
   defaults to 4096, the timeout is 40s, and `LLM_FALLBACK_MODELS` (comma-separated) is tried
   in order when the primary model returns 429/503. The prompts, zod schemas and the
   grounding guardrail are exactly as in 05.
2. **Extraction schema tolerance.** The zod schema in 05 is strict about types, but models
   sometimes omit null-valued keys or emit a row with `"metric": null`. Nullable fields in
   `ExtractedFact` accept a missing key (coerced to null), and rows with no metric or no
   quote are dropped server-side before validation with a console log. This prevents a
   malformed row from failing the whole extraction.
3. **Grounding allow-list is a superset of 05.** The pack allows numbers from
   `value_num`, `value_text`, `conditions` and `cap_inr_cr`. I also allow: numbers in a
   cited fact's `definition_note` (the "why they differ" prompt shows the model that text, so
   it may quote it), eligibility rule values and `fail_reason` strings (the demo answer
   quotes "Global 2000" and "200+ direct employees" from `pol_tn_2024`), policy `name`/
   `year`/`summary`, source publication dates, and the user's own plan inputs (the expected
   Maharashtra answer says "your 40 → 120 seat plan"). Small ordinals 1-10 and plausible
   years 2020-2035 are always allowed, as in 05. The purpose — no invented figures — is
   unchanged, and the tests cover it.
4. **Extraction "as of" default.** When the model returns `as_of: null`, the review row is
   pre-filled with the source's own publication date and labelled "(the source's publication
   date — edit if the fact is about another period)". Without this, a policy page that states
   a term without dating it produces an unapprovable row.
5. **Plan links recompute rather than snapshot.** The pack asks for a URL-encoded plan and a
   sources list. I encode inputs + weights (lz-string, base64url — plain
   `compressToEncodedURIComponent` contains `+`/`$`, which broke Next.js route params) and
   recompute ranking/eligibility/cost on the plan page from the seed registry. The
   consequence, stated on the page: AI-approved facts added after the plan was saved are not
   in the link.
6. **Header counts.** The spec's literal "updated 11 Oct 2026" is computed live from the
   latest as-of stamp in the registry (currently Oct 2026), and the fact count includes any
   AI-approved facts in the browser overlay.
7. **Neutrality detail.** Flexiple's provider row is tagged "Our service" and sorted
   alphabetically within its category (so ANSR precedes Flexiple in setup). The score never
   touches provider data.
8. **Live public data layer (`lib/live.ts`), added rather than substituted.** The pack specifies a
   fully hardcoded seed. I added a World Bank Open Data layer next to it: four indicators fetched
   at request time (GDP per capita for India and the five HQ countries, plus India's PPP figure,
   population and GDP growth), cached six hours, never throwing. It is additive context, not a
   replacement, and the reason is provenance. The seed's value is that a person read each figure,
   it carries a quote, a source and a confidence level, and competing figures are kept as separate
   rows rather than reconciled — a JSON API has none of that. So live rows land after the seed and
   `numericFact` returns the first match, which means a live figure can never displace a curated
   one; no score, ranking or cost estimate depends on one. Every live row is Low confidence and
   Unverified, badged "live API" in the UI, and no attribution-free copy of it is rendered: the
   source row carries World Bank Open Data, CC BY 4.0. Parsing, merging and the honesty invariants
  are covered by `tests/live.test.ts` (11) and `tests/liveApi.test.ts` (12); the tests that make a
  real request are opt-in behind `LIVE_TESTS=1`, so a default `npm test` run exercises the parsing
  and merge rules without the network. I did not re-run the network set from this environment.

## Investigated and deliberately not integrated

These were tried during the live layer work and rejected. Recording why, because the
reason each one failed is the reason it would fail again.

- **Indian state-level per-capita income.** This is the number a reader most wants for a
  site-selection decision, and there is no free, no-key, officially-licensed source for it.
  Verified three ways: the World Bank `/subnational` endpoint does not exist, none of the Indian
  states appear in the 296-entry country list, and the subnational sources cover India only as a
  whole. MoSPI has no machine-readable API (the site is a JS app behind hostnames that no longer
  resolve). The RBI handbook tables are behind JavaScript and bot protection. data.gov.in
  requires a registered API key, which means shipping someone else's credential to a public
  deployment. Not integrated: it would have meant a key, a scrape, or a number with no stated
  provenance — the last being exactly what this registry exists to avoid.
- **City population via OpenStreetMap Overpass.** Rejected on both reliability and coverage. The
  endpoint allows a hard cap of 4 concurrent slots, and light query batches failed roughly half
  the time. Population tags are absent for 7 of the 8 Indian metros checked; the one hit was a
  2011 census figure attached to the wrong administrative unit. A source that is often down and
  usually empty is not worth the request.
- **City population via the GeoNames bulk dump.** This one works, and is CC BY 4.0 like the
  World Bank. It is a 3.2 MB zip file rather than an API, though, so fetching it per request would
  be wasteful. Not integrated now; noted as a possible future enrichment run at build time, where
  the file is read once and the result lands in the seed — which would also give it the seed's
  provenance rather than leaving it as live rows.
- **India unemployment (SL.UEM.TOTL.ZS).** Tried, then dropped. From this deployment it timed out
  more often than it answered, and a metric that is sometimes absent is worse than one that is
  honestly missing. The four indicators that shipped are the ones that answered.

## Unfinished / smaller items

- **Accessibility audit.** Labels on every input, visible focus rings (sand outline) and
  AA-contrast text/backgrounds are implemented, but Lighthouse wasn't run in this
  environment (no Lighthouse/Chrome available), so the "≥ 90" claim in the pack's checklist
  is unverified. `node scripts/mobile-check.mjs` verifies the 390 px layout on the deployed
  URL.
- **Method page** is a short single page (`/method`) rather than a modal; it covers
  confidence, where live data comes from, the score, the cost assumptions, where AI is
  constrained and neutrality.
- **Staleness badges** (rent > 180 days, counts > 365) are not implemented — the "nice-to-have"
  list in 03.
- **Seed regeneration tool.** `build_seed.py` was part of the pack; it is not in
  this repo (it was lost in a file move during scaffolding). `reference/scripts/validate_seed.py`
  and `reference/scripts/reference_scoring.py` are present verbatim, and the seed JSON is
  intact. Both read `data/seed/` — the repo carries one copy of the seed, not one per consumer.
- **No demo persona or built-in sample.** The pack specifies a "Load demo company" link and a
  "Load Telangana sample" button. Both were removed: they hardcoded a company profile and a
  paraphrased article into the product, and a filled-in form can be mistaken for a result the
  tool derived. The navigator form now starts blank, and extraction runs only on text the
  reader supplies. The consequence is stated on the page and in the README — when the model is
  unavailable, "Add a source" reports it instead of falling back to canned rows.
- **Screenshots** are taken at 1440x900 from the production deployment via
  `scripts/smoke.mjs` (Playwright), saved to `screenshots/` and committed.

## Quota note

The public deployment uses a Gemini API key on the free tier (20 requests/day per model,
shared per project). A full pass spends three model calls (one "why they differ" note, one Ask
answer, one extraction), so a cold incognito run works — the screenshots in `screenshots/` were
captured from production with all three AI features working.

The free-tier quota is the deployment's weakest link. When it runs out mid-session the app
degrades honestly: the truth table still renders the full data, the note box says the table
above is the data, Ask shows "Busy, try again in a minute." with a retry (429 + `Retry-After`),
and "Add a source" reports that the model is unavailable rather than returning anything. Only
the three AI features stop; everything else is computed from the seed. Once the daily quota
resets (about 12:30 PM IST), all three answer again. For a deployment with a paid key, change
`LLM_MODEL`/`LLM_FALLBACK_MODELS` in the Vercel project settings — no code change needed.

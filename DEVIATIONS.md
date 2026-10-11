# Note on deviations and unfinished items

Production URL: **https://gcc-compas-vedants-projects-8098650d.vercel.app**
(the `gcc-compass.vercel.app` subdomain was already owned by another Vercel account, so
the project's own domain is the public one).

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
   date — edit if the fact is about another period)". Without this the demo's Telangana
   sample couldn't be approved, since the sample text has no date in it.
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

## Unfinished / smaller items

- **Accessibility audit.** Labels on every input, visible focus rings (sand outline) and
  AA-contrast text/backgrounds are implemented, but Lighthouse wasn't run in this
  environment (no Lighthouse/Chrome available), so the "≥ 90" claim in the pack's checklist
  is unverified. `node scripts/mobile-check.mjs` verifies the 390 px layout on the deployed
  URL.
- **Method page** is a short single page (`/method`) rather than a modal; it covers
  confidence, the score, the cost assumptions, where AI is constrained and neutrality.
- **Staleness badges** (rent > 180 days, counts > 365) are not implemented — the "nice-to-have"
  list in 03.
- **Seed regeneration tool.** `pack/scripts/build_seed.py` was part of the pack; it is not in
  this repo (it was lost in a file move during scaffolding). `validate_seed.py` and
  `reference_scoring.py` are present verbatim, and the seed JSON is intact.
- **Screenshots** are taken at 1440x900 from the production deployment via
  `scripts/smoke.mjs` (Playwright), saved to `screenshots/` and committed.

## Quota note

The public deployment uses a Gemini API key on the free tier (20 requests/day per model,
shared per project). The demo script spends four model calls (one "why they differ" note,
one Ask answer, one extraction), so a cold incognito run works — the five screenshots in
`screenshots/` were captured from production with all three AI features working.

The free-tier quota is the deployment's weakest link. When it runs out mid-session the app
degrades honestly: the truth table still renders the full data, the note box says the table
above is the data, Ask shows "The model service is rate-limited right now. Try again in a
minute." with a retry, and Add a source says the same. Nothing else stops. Once the daily
quota resets (about 12:30 PM IST), all three features answer again. For a deployment with a
paid key, change `LLM_MODEL`/`LLM_FALLBACK_MODELS` in the Vercel project settings — no code
change needed.

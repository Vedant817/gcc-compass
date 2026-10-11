# GCC Compass

A working prototype for a mid-market US/EU company opening its first Global Capability
Centre (GCC) in India. It answers four questions with sourced data instead of opinions:
how many GCCs are there (and why the answers disagree), which city to shortlist, which
state incentives you actually qualify for, and what it costs over three years.

Built by Vedant Mahajan for the Flexiple Product Intern take-home, October 2026.

Live: <https://gcc-compas-vedants-projects-8098650d.vercel.app> · Source:
<https://github.com/Vedant817/gcc-compass>

## What it is

Five screens, one job each:

| Screen | What it answers |
|---|---|
| **Truth table** (`/truth`) | Every published answer to one question, side by side with its source, date, definition and confidence. Nothing is averaged. |
| **Setup Navigator** (`/navigator`) | Your company profile in, a ranked shortlist out — with the score broken into components, weight sliders, an eligibility checker, a 3-year cost estimate and who to call. |
| **Ask** (`/ask`) | Plain-English questions answered only from the registry, with citation chips on every claim. |
| **Add a source** (`/add-source`) | Paste text, the model proposes facts with verbatim quotes, you approve or reject each row. Nothing enters the registry without your click. |
| **Plan** (`/plan/[id]`) | Your shortlist, eligibility, cost and every citation on one printable page, shareable by link. |

## How truth works

Every number is a **fact**: a value plus a source, an as-of date, a definition note and a
confidence level. Two publishers reporting the same metric are two rows, never merged and
never averaged — the "Truth table" page exists to show the disagreement, not hide it.
Ranges keep their published text (`1,800-1,900`); the stored number is the midpoint, used
only for charting. The model never writes a number that isn't already in a fact.

The seed (28 sources, 70 facts, 6 policies, 12 providers) was compiled from published
research and is in `data/seed/`. Where a figure couldn't be confirmed, it stays in the
registry marked `[UNVERIFIED]` at Low confidence. Where research only recorded a site, the
link is flagged "site-level link" instead of a guessed URL. Missing data is shown as
missing: Chennai isn't ranked because there's no CTC or attrition figure, and the app says
so instead of guessing.

Validate the seed with `python3 pack/scripts/validate_seed.py`; the TypeScript twin of
those checks runs in `npm test`.

## How the score works

Five components per city — talent share, Grade A rent, estimated mid-level SWE CTC,
attrition, and best incentive eligibility. Each is min-max normalised across the candidate
cities that have a value; missing values stay missing (never zero, never imputed). Then:

```
score = 100 × Σ(weight × normalised) ÷ Σ weight     over components with data
```

A city is ranked only when the components it has cover at least 60% of the weight, otherwise
it lands in "Not enough data to rank" with the missing pieces named. Weights are a product
judgment, not data, so the sliders are right there: switch from Lowest cost to Talent depth
and Bengaluru climbs from 31.8 to 50.9. The weights, the formula and the assumptions
(A1-A5 on the cost estimate) are all on screen.

The scoring, eligibility and cost logic is a TypeScript port of `pack/scripts/reference_scoring.py`,
and the unit tests reproduce `seed/expected_demo_output.json`: Pune 77.2, Hyderabad 57.2,
Bengaluru 31.8 on Lowest cost; Pune's 3-year total ≈ ₹44.69 Cr.

## Where AI is used, and how it's constrained

Three places, all server-side through one OpenAI-compatible client (`lib/llm.ts`):

1. **Ask the registry.** The model sees the whole registry as compact JSON and a system
   prompt that forbids outside knowledge. Then the server checks the answer itself: every
   number in it must appear in a cited fact or policy, or the answer is retried once and then
   dropped with "Couldn't produce a grounded answer." Unanswerable questions get a "this
   isn't in the registry yet" banner, not a guess.
2. **"Why they differ" notes** on the Truth table, written only from definition, date and
   source-type fields, with the same grounding check.
3. **Extraction** on Add a source. The model returns strict JSON (zod-validated) with an
   exact quote per fact. A row whose quote isn't found verbatim in the pasted text can't be
   approved, and approved facts are stamped `extracted_by=ai, verified_by_human=true`.

AI is never in the score, the eligibility rules or the cost formula. Those are plain
TypeScript in `lib/`.

## Running it locally

```bash
npm install
cp .env.example .env.local     # add your LLM keys (optional; AI features say "AI is off" without them)
npm run dev                    # http://localhost:3000
npm test                       # 80 unit tests: scoring, eligibility, cost, grounding, seed integrity
python3 pack/scripts/validate_seed.py   # seed validator from the pack
node scripts/smoke.mjs         # full demo script against a running instance (BASE_URL, npm start)
node scripts/shot-addsource.mjs           # retry helper when the model quota is flaky
```

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `LLM_API_KEY` | for AI features | server-side only, never exposed to the browser |
| `LLM_BASE_URL` | for AI features | any OpenAI-compatible endpoint (default `https://api.openai.com/v1`) |
| `LLM_MODEL` | for AI features | e.g. `gemini-flash-latest`, `gpt-4o-mini` |
| `LLM_FALLBACK_MODELS` | optional | comma-separated models tried when the primary is rate-limited |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | optional | unused in the default deployment |

Without a key everything non-AI still works: the registry, navigator, eligibility, cost and
plan pages are pure client/server TypeScript.

## Deployment

Deployed on Vercel (Node runtime, `maxDuration = 30` on the LLM routes). There is no
database: the seed is imported at build time into a typed in-memory registry, AI-approved
facts live in the browser's localStorage as an overlay, and a plan is encoded in its URL
(`lz-string` + base64url), so a shared link reopens the same plan anywhere. Leads POST to
`/api/leads` and are logged server-side; no email is sent.

## Known limitations

- **Seed size.** 70 facts is enough to demo the shape of the problem, not to answer
  everything. The "why they differ" note is cached per metric+fact set in memory, which a
  serverless deployment re-warms per instance.
- **Domain-level links.** Some sources only recorded the publisher's site, not the exact
  page; those are flagged rather than guessed.
- **The CTC proxy.** The cost estimate applies the mid-level SWE CTC to every seat,
  including ops roles, so it overstates ops-heavy teams. The assumption is labelled A4.
- **Plan recomputation.** A plan link recomputes from the seed registry; AI-approved facts
  added after the plan was saved aren't in the link.
- **Single plan per browser.** Plans live in URLs and localStorage; there are no accounts.
- **No server-side persistence for approvals.** The overlay is per-browser, which is the
  honest default for a prototype: the registry the server validates against is the seed
  plus whatever your browser sends with each question.

## What's next

- Auto-upgrade domain-level links to exact pages when an analyst confirms them.
- Add a Turso overlay table so approved facts are shared across reviewers instead of
  living in one browser.
- Widen the seed: CTC and attrition figures for Chennai, Mumbai and NCR would take them out
  of "Not enough data".
- Staleness badges (rent after 180 days, counts after a year).
- A compare-two-cities view and a city map, both gated on the same registry.

## Repo map

```
app/            pages (truth, navigator, ask, add-source, plan, method) and API routes
components/     UI primitives (restyled, no default theme) + feature components
lib/            registry, scoring, eligibility, cost, llm, prompts, grounding, plan, overlay
data/seed/      the registry seed (sources, facts, cities, states, policies, providers)
tests/          vitest: scoring vs expected_demo_output.json, eligibility, grounding, seed
pack/           the build pack this was made from (spec, design guide, reference implementation)
scripts/        smoke.mjs (demo script + screenshots), shot-addsource.mjs
screenshots/    the five deck screenshots (1440×900) and the plan export
```


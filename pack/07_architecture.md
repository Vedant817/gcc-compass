> **Historical brief, not a description of this app.** This file is the original client brief, kept as a record of what was asked for. It is not a description of what GCC Compass does today.
>
> Three specified items were deliberately not built: the demo persona, the built-in Telangana sample article, and the cached-extraction fallback. `DEVIATIONS.md` at the repo root records why.
>
> Where a path named here differs from the repo, the repo wins. Read the code and `DEVIATIONS.md`, not this file.

---

# 07 Architecture

## Stack
- **Next.js 14/15 App Router**, TypeScript (strict), Tailwind CSS, shadcn/ui (restyled per 06), Recharts, zod, nanoid.
- **Data:** seed JSON files imported at build time into a typed in-memory registry (`lib/registry.ts`). This is the recommended path because it is read-only, fast and works on Vercel with zero setup.
- **Writes** (AI-approved facts, plans, leads), pick ONE:
  - **Option A (default, zero infra):** store in the browser's `localStorage` as an overlay merged over the seed on the client, and send overlay facts with each `/api/ask` call. Plans encoded in the URL (`/plan/[id]` where id = base64url of compressed inputs via `lz-string`), so shared links work without a DB. Leads POST to `/api/leads`, logged server-side (and kept in localStorage for demo).
  - **Option B (if time allows):** **Turso/libSQL** (`@libsql/client`) using `schema.sql`, with env `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. Seed with `scripts/seed-db.ts`.
  - **Do not** rely on `better-sqlite3` writing to disk on Vercel: the filesystem is read-only/ephemeral and native modules complicate builds. better-sqlite3 is fine for local dev only.
- **LLM:** any OpenAI-compatible endpoint via `fetch` or the `openai` SDK with `baseURL`. Env: `LLM_API_KEY`, `LLM_BASE_URL` (e.g. `https://api.openai.com/v1`), `LLM_MODEL` (e.g. a small fast JSON-capable model). Server-side only; never expose the key to the client.

## Folder structure
```
gcc-compass/
  app/
    layout.tsx               # fonts, top bar, footer
    page.tsx                 # redirects to /truth (or renders Truth table)
    truth/page.tsx
    navigator/page.tsx
    ask/page.tsx
    add-source/page.tsx
    plan/[id]/page.tsx
    method/page.tsx          # confidence + scoring explainer
    api/
      ask/route.ts           # POST {question, plan?, overlayFacts?} -> AskResponse
      why/route.ts           # POST {metric, entityIds} -> {note, cited_ids}
      extract/route.ts       # POST {text?, url?, meta} -> Extracted (+ quote checks)
      leads/route.ts         # POST {planId, name, email, note, consent}
      registry/route.ts      # GET full registry (for debugging/README)
  components/
    TruthChart.tsx  FactTable.tsx  CitationChip.tsx  ConfidenceBadge.tsx
    NavigatorForm.tsx  RankingTable.tsx  WeightSliders.tsx  EligibilityCard.tsx
    CostTable.tsx  ProviderList.tsx  ChatThread.tsx  ExtractionReview.tsx  LeadForm.tsx
    ui/ (shadcn)
  lib/
    registry.ts      # load seed, typed getters: factsFor(metric, entity), policiesFor(state)...
    overlay.ts       # localStorage overlay (client)
    scoring.ts       # port of reference_scoring.rank
    eligibility.ts   # rules engine
    cost.ts          # 3-yr cost
    llm.ts           # client + JSON retry
    prompts.ts       # prompts from 05, verbatim
    grounding.ts     # number/id checks
    format.ts        # en-IN number formatting
    types.ts         # zod schemas + TS types
  data/seed/*.json   # copied from this pack
  scripts/validate_seed.py (copied) and/or validate-seed.ts
  tests/
    scoring.test.ts  # asserts expected_demo_output.json
    eligibility.test.ts
    grounding.test.ts
  README.md
```

## API contracts
| Route | Request | Response | Notes |
|---|---|---|---|
| `POST /api/ask` | `{question: string (≤500), plan?: NavigatorInputs, overlayFacts?: Fact[]}` | `AskResponse & {citations: Citation[]}` | server resolves ids to source info; grounding enforced |
| `POST /api/why` | `{metric, entityIds: string[]}` | `{note, cited_ids}` | cache in memory by key |
| `POST /api/extract` | `{text?: string (≤20k chars), url?: string, meta: SourceMeta}` | `{facts: (ExtractedFact & {quote_found: boolean})[], warnings}` | URL fetch server-side, strip HTML, 10 s timeout |
| `POST /api/leads` | `{planId, name, email, note?, consent: true}` | `{ok: true}` | zod email check; console.log; no email sent |
| `GET /api/registry` | – | `{sources, facts, cities, states, policies, providers}` | |
Basic protection: per-IP in-memory rate limit on LLM routes (e.g. 20/min), input length caps.

## Env vars (`.env.example`)
```
LLM_API_KEY=
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=
# optional (Option B)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

## Deploy (Vercel)
1. Push to a public GitHub repo `gcc-compass`.
2. Import into Vercel, framework Next.js, set env vars for Production and Preview.
3. API routes on the Node.js runtime (not edge) for simplicity; `export const maxDuration = 30` on LLM routes.
4. Smoke-test the production URL with the full demo script (08), not just localhost.

## Testing checklist
- [ ] `python3 scripts/validate_seed.py` passes (or TS equivalent in CI/`npm test`).
- [ ] `scoring.test.ts`: demo persona × 4 presets match `expected_demo_output.json` / table in 04 (±0.1).
- [ ] `eligibility.test.ts`: TN not eligible for the demo persona (2 reasons); KA not eligible for `bengaluru` and eligible for any other KA city id (use a test-only id like `mysuru`); UP needs check when investment is blank, eligible at 60, not eligible at 10.
- [ ] `grounding.test.ts`: answer with an invented number is rejected; "₹50,000" matches "₹50K"-style policy text.
- [ ] Ask: Maharashtra answer cites pol_mh_2025; Kolkata → not_in_registry.
- [ ] Extract: Telangana sample yields gcc_policy_status for TS with a quote found; approved fact appears on refresh.
- [ ] No key set → AI features degrade with message, rest works.
- [ ] Lighthouse accessibility ≥ 90 on /truth and /navigator.
- [ ] grep the codebase/UI for emoji, "AI-powered", gradient classes (`bg-gradient`, `from-purple`) → none.

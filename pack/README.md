# The original client brief (historical)

> **Historical brief, not a description of this app.** Everything in `pack/` is the original brief this project was built from, kept as a record of requirements. It is not a description of what GCC Compass does today.
>
> Three specified items were deliberately not built: the demo persona, the built-in Telangana sample article, and the cached-extraction fallback. `DEVIATIONS.md` at the repo root records why.
>
> Where a path named here differs from the repo, the repo wins. Read the code and `DEVIATIONS.md`, not these files.

## What each file is

| File | What it is |
|---|---|
| [`01_context.md`](01_context.md) | The assignment, the chosen wedge and first user, the core insight, and the neutrality rule. |
| [`02_product_spec.md`](02_product_spec.md) | The PRD: five pages, their user stories, states and acceptance criteria. |
| [`03_data_model.md`](03_data_model.md) | Schema rationale, the conflicts-and-definitions rules, and the metric dictionary. |
| [`04_scoring_and_rules.md`](04_scoring_and_rules.md) | Ranking components and weights, the eligibility engine, the 3-year cost model, and a worked example. |
| [`05_ai_prompts.md`](05_ai_prompts.md) | The three prompts verbatim, their zod schemas, and the server-side grounding guardrail. |
| [`06_design_guide.md`](06_design_guide.md) | Palette, typography, layout, copy tone and the hard "avoid" list. |
| [`07_architecture.md`](07_architecture.md) | Stack, folder layout, API contracts, deploy notes and the testing checklist. |
| [`schema.sql`](schema.sql) | SQLite/Turso DDL for the registry — the Option B database that was not taken. |

Read these as a record of what was asked for, not as instructions. If a file here and the code disagree, the code is right and this brief is stale.
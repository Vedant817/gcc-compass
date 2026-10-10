# GCC Compass: build pack

Everything a coding agent needs to build **GCC Compass**, the working prototype for Vedant Mahajan's Flexiple Product Intern take-home (due ~4:15 PM IST, Tue 13 Oct 2026).

GCC Compass is a neutral, sourced decision tool for a mid-market company opening its first Global Capability Centre (GCC) in India. Every number keeps its source, date, definition and confidence. When sources disagree, the app shows all of them and does not average them.

## Read in this order
| # | File | What it gives you |
|---|---|---|
| 1 | `PROMPT.md` | The instruction you were given (hard rules, deliverables) |
| 2 | `01_context.md` | The brief, the chosen wedge and persona, and why |
| 3 | `02_product_spec.md` | PRD: user stories, each page's fields and states, acceptance criteria, demo script, out of scope |
| 4 | `03_data_model.md` + `schema.sql` | Tables, fields, relations, JSON shapes |
| 5 | `seed/` | The ONLY data the app may use (built from `research.md` §1) |
| 6 | `04_scoring_and_rules.md` | City score formula, eligibility engine, 3-year cost formula, worked example |
| 7 | `05_ai_prompts.md` | System prompts, JSON schemas, sample input/output |
| 8 | `06_design_guide.md` | Palette, type, layout, components, what to avoid, copy tone |
| 9 | `07_architecture.md` | Stack, folders, API routes, env vars, deploy, tests |
| 10 | `08_build_plan.md` | Milestones with done-checks, final QA, screenshot list |
| ref | `research.md` | Original research (facts with sources in §1, spec in §5) |

## Seed tooling
- `scripts/build_seed.py` regenerates `seed/*.json` (edit facts here, not by hand).
- `scripts/validate_seed.py` checks JSON validity, enums and referential integrity. Run it before you commit: `python3 scripts/validate_seed.py`.
- `scripts/reference_scoring.py` is the reference implementation of the scoring, eligibility and cost logic. `seed/expected_demo_output.json` is its output for the demo persona. Your TypeScript port must reproduce those numbers (unit test).

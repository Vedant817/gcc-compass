You are building GCC Compass, a working prototype for a Flexiple Product Intern take-home. It's a neutral, sourced decision tool for a mid-market US/EU company opening its first Global Capability Centre (GCC) in India. The reviewers judge the thinking AND the look, and they asked for "a lot of AI, but no slop."

The attached folder `gcc-compass-pack/` is your full context. Read it in this order before writing code: README.md, 01_context.md, 02_product_spec.md, 03_data_model.md + schema.sql, seed/ (all JSON), 04_scoring_and_rules.md, 05_ai_prompts.md, 06_design_guide.md, 07_architecture.md, 08_build_plan.md. research.md is background; if it conflicts with the pack, the pack wins.

Build the full app described in 02_product_spec.md: Truth table, Setup Navigator (ranking with weight sliders, eligibility checker, 3-year cost, providers), Ask the registry, Add a source (AI extraction plus human approval), and Plan export with lead form. Follow the milestones in 08_build_plan.md and check each "done when" before moving on.

Hard rules:
1. Data: use ONLY the facts in seed/. Never invent, round into new figures, or "fill in" numbers. Missing data is shown as missing (e.g. "Not enough data to rank"). [UNVERIFIED] facts keep Low confidence and a visible badge. Domain-level source links get a "site-level link" flag. Run scripts/validate_seed.py.
2. Conflicts are shown side by side with source, date and definition, and never averaged or merged.
3. Logic: implement scoring, eligibility and cost exactly as in 04_scoring_and_rules.md. Unit tests must reproduce seed/expected_demo_output.json and the preset table in 04 (Pune 77.2, Hyderabad 57.2, Bengaluru 31.8 on Lowest cost; Pune 3-yr ≈ ₹44.69 Cr).
4. AI must be real and grounded: use the prompts and zod schemas in 05_ai_prompts.md via an OpenAI-compatible API (env LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, server-side only). Answers cite fact/policy ids as chips, say "not in the registry" when the data doesn't cover it, and pass the server-side grounding check (no number that isn't in a cited fact). Extraction returns strict JSON with verbatim quotes, and nothing enters the registry without a human Approve click.
5. Design must look hand-built and match the deck: palette, fonts and rules in 06_design_guide.md (ink #304359, slate #415977, sand #F1CF9D accent, off-white #F7F7F7, serif headings, Jost/Inter body). Dense tables, sources under every chart. No purple/gradients, glow, emoji, sparkle icons, hero blobs, or "AI-powered" copy, and don't leave the default shadcn theme as is. Copy is plain and specific.
6. Neutrality: Flexiple is tagged "Our service" alongside alternatives. It's never pinned first and never favoured by the score.
7. Must work end to end on the public Vercel URL (no disk-writing SQLite on Vercel; use the in-memory seed plus localStorage/URL-encoded plans, or Turso, as in 07_architecture.md).

Don't stop at a skeleton. Every page needs its empty, loading and error states, and the 3-minute demo script in 02_product_spec.md must run cleanly in a fresh incognito window on production.

Deliver:
- The public Vercel URL.
- A public GitHub repo with a short README written in a human voice: what it is, how truth works, how the score works, where AI is used and how it's constrained, how to run it locally, env vars, known limitations, and what's next. Include seed data and tests.
- 5 PNG screenshots at 1440×900, named and framed as listed in 08_build_plan.md (truth table, setup wizard, eligibility + 3-yr cost, ask the registry, add a source + export).
- A short note listing anything you couldn't finish or any deviation from the pack, and why.

If something in the pack is ambiguous, choose the option that keeps the data honest and the demo working, write it down in the note, and keep going.

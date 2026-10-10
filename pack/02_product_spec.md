# 02 Product spec (PRD): GCC Compass v0.1 prototype

## Goal
In under 3 minutes, show a reviewer: (a) the data disagrees and we show why, (b) a mid-market entrant gets a sourced, personal shortlist, eligibility and cost, (c) AI answers only from the registry, and (d) new facts enter through AI extraction plus human approval.

## User stories
| ID | As a... | I want to... | So that... |
|---|---|---|---|
| U1 | Entrant (VP Ops/CFO) | see every published answer to "how many GCCs / in city X" | I stop trusting a single headline number |
| U2 | Entrant | enter my company profile and get ranked cities with the score broken down | I can defend the shortlist to my CEO |
| U3 | Entrant | see which state incentives I am eligible for, and why not | I don't plan around money I won't get |
| U4 | Entrant | see a 3-year cost for my top cities with the formula | I can budget |
| U5 | Entrant | ask questions in plain English and get cited answers | I don't read 7 policy PDFs |
| U6 | Registry editor (analyst) | paste a source and approve AI-proposed facts | the registry grows without unverified numbers slipping in |
| U7 | Entrant | export my plan with citations and request a call | I can share it internally and get help |

## Global layout
Top bar: wordmark "GCC Compass", nav: Truth table · Navigator · Ask · Add a source · (Plan appears after a plan exists). Right side: "Registry: 70 facts · 28 sources · updated 11 Oct 2026" (computed live). Footer: "Prototype. Figures are as published by the cited sources; estimates are labelled."

## Page 1: Truth table (`/` and `/truth`)
**Purpose:** U1.
**Controls:** metric picker (select) with presets:
- "GCCs in India (count)" → metric `gcc_count`, entity IN. Toggle "also show centres (locations)" adds `gcc_centre_count` and `gcc_count_records` in a different bar shade.
- "GCCs in Bengaluru" → `gcc_count` + `gcc_centre_count` for bengaluru. Also Hyderabad, Pune, Chennai.
- "2030 projection, India" → `gcc_count_2030_projection`.
- "Grade A office rent by city" → `office_rent_grade_a` across cities (comparison mode: one bar per city, not per source).
- "Share of GCC talent by city" → `gcc_talent_share_pct`.
**Output:**
- Horizontal bar chart (Recharts), one bar per fact, label = publisher + as_of. Ranges (value_text like "1,800-1,900") drawn as a bar to the midpoint plus a thin range line; label shows the text.
- Headline line above chart: "7 sources · 1,700 to 2,000+ · spread 18%" (computed: (max-min)/min).
- Table: Source (link, opens new tab) · Value (value_text if present else formatted value_num + unit) · As of · Definition · Confidence badge (H/M/L) · Flags ([UNVERIFIED], "domain-level link").
- "Why they differ" box: 1-3 sentences from the LLM (see 05), grounded in definition_note/as_of/source type only, with fact-id chips. Cached per metric. A "Regenerate" link.
**States:** loading (skeleton rows, no spinners over the whole page); empty ("No facts for this metric yet. Add a source."); LLM error ("Couldn't write the note. The table above is the full data.") and the table still renders; single-source metric: box says "Only one source; nothing to reconcile."
**Acceptance:** India preset shows ≥6 bars from 1,700 to 2,000; Bengaluru shows 487, 875+ (centres, shaded differently), ~950; no averaged number appears anywhere.

## Page 2: Setup Navigator (`/navigator`)
**Step 1, Company (form, single page, sections):**
| Field | Type | Default | Validation |
|---|---|---|---|
| HQ country | select (US, UK, Germany, France, Netherlands, Other EU, Other) | US | required |
| Company size (employees) | number | 400 | 10-1,000,000 |
| Forbes/Fortune Global 2000? | yes/no | no | required |
| Seats in year 1 | number | 40 | 1-2,000 |
| Seats in year 3 | number | 120 | ≥ year 1 |
| Functions | multi-check: Engineering, Operations, Finance, Analytics | Eng+Ops | ≥1 |
| Priority | radio: Lowest cost · Talent depth · Incentives · Balanced | Lowest cost | |
| Open to Tier-2 cities? | yes/no | no | |
| Planned India investment (₹ Cr) | number, optional, "Leave blank if unknown" | blank | ≥0 |
A "Load demo company" link fills the demo persona. Submit button: "Build my shortlist".

**Step 2, Results (same page, below or right):**
1. **City ranking table:** Rank · City · Score (0-100) · stacked mini-bar of component contributions · Talent share · Rent ₹/sq ft · Est. CTC (₹L) · Attrition · Incentive status. Cities below coverage threshold go in a separate "Not enough data to rank" list with the missing components named (e.g. "Chennai: no CTC or attrition figure in the registry").
2. **Weight sliders** (5, each 0-100, auto-normalised to 100% and shown as %); preset buttons equal the priority options. Ranking re-computes instantly client-side.
3. **"How this score works"** disclosure: the formula from 04 with the live weights.
4. **Incentive eligibility checker:** one card per relevant policy (states of shortlisted cities, plus all states if Tier-2 open). Status pill Eligible / Not eligible / Needs check + reason lines + incentive list (type, %, cap, duration) + source link. Telangana and Haryana appear as "No GCC fiscal policy on record (2025)" and "Policy expected [UNVERIFIED]".
5. **3-year cost estimate** for top 3 ranked cities: table Year · Seats · Rent · Salaries · Total (₹ lakh and ₹ Cr), formula and assumptions listed (A1-A5 in 04) and an "Estimate" label. If a city lacks CTC, show "Salary data missing; rent only" rather than a total.
6. **Who to call:** provider categories suggested by functions (setup_bot always; recruiting if eng; eor if seats_y1 < 25 i.e. before entity economics; legal_tax always; real_estate always) with providers listed. Flexiple has an "Our service" tag; order alphabetical within category so Flexiple is not pinned on top. No ratings.
7. Button "Save & export plan" → creates a plan and goes to `/plan/[id]`.
**States:** before submit, show a short explainer and the empty results frame; validation errors inline under fields; if all cities lack data → message.
**Acceptance (demo persona, priority Lowest cost):** Pune 77.2, Hyderabad 57.2, Bengaluru 31.8 (±0.1); Chennai, Mumbai, Gurugram, Noida in "Not enough data"; TN "Not eligible: requires Global 2000; requires 200+ direct employees"; Karnataka "Not eligible: only outside Bengaluru"; Maharashtra "Needs check"; 3-yr total Pune ≈ ₹44.69 Cr. See `seed/expected_demo_output.json`.

## Page 3: Ask the registry (`/ask`)
- Chat thread, input at bottom, 4 suggested questions as plain text buttons: "What would Maharashtra pay me?", "Which state would pay part of my office rent for a 60-seat centre in a Tier-2 city?", "Why do GCC counts for Bengaluru differ?", "What is the attrition in Chennai?".
- If a plan exists in session, its inputs are passed as context (persona-aware answers).
- Answer renders markdown-lite (paragraphs, bullets) + citation chips `[f402]` → hover shows source, value, date; click opens source URL.
- Answer footer: "Answered from N facts and M policies." If the model returned `not_in_registry: true`, show grey banner "This isn't in the registry yet" + link to Add a source.
- Server validates every cited id exists and every number in the answer text appears in a cited fact/policy; if not, drop the answer and show "Couldn't produce a grounded answer. Try rephrasing." (See 05 guardrail.)
**States:** streaming or "Checking the registry…" text; error with retry; empty thread shows suggestions.
**Acceptance:** "What would Maharashtra pay me?" lists capex 20% (₹10-100 Cr cap) OR rental 10/20% (₹1-4 Cr), payroll up to ₹50K/employee/month, power/duty, cites pol_mh_2025, mentions eligibility needs check. "What is the GCC count in Kolkata?" → not in registry.

## Page 4: Add a source (`/add-source`)
- Fields: Source title, publisher, URL (optional), published date, type (enum), and a large textarea "Paste the text". "Load Telangana sample" link fills the sample from 05.
- "Extract facts" → LLM returns candidate facts (strict JSON). Show as editable rows: entity, metric, value, unit, as_of, definition, quote (exact supporting span, highlighted in the pasted text), confidence suggestion.
- Each row: Approve / Reject / Edit. Approve writes source (once) + fact with `extracted_by="ai"`, `verified_by_human=true`, then toast "Added f071 to registry" with link to Truth table filtered.
- Rows whose quote is not found verbatim in the pasted text are auto-flagged "Quote not found in text" and Approve is disabled until edited.
- If URL given and no text: try server-side fetch (text only); on failure ask to paste text.
- A "Recently added" table shows AI-extracted facts with a badge "AI-extracted · human-approved".
**Persistence:** see 07 (in-memory + localStorage overlay on Vercel, or Turso). Must survive a page refresh in the demo browser.
**Acceptance:** Telangana sample → proposes state TS `gcc_policy_status` = "No dedicated GCC fiscal policy" as_of 2025 with quote; approve → appears in registry count and in Navigator's Telangana card source list.

## Page 5: Plan + export (`/plan/[id]`)
- Print-friendly page: company inputs, ranked cities with weights, eligibility cards, 3-yr cost with assumptions, providers, and a numbered **Sources** list (every fact used, with URL and date). Generated date.
- Buttons: "Copy link", "Download PDF" (`window.print()` with print CSS is enough).
- Lead form: "Talk to someone who has built 20-person GCCs". Name, work email, optional note, consent checkbox. On submit store in leads (server log / table) and show "Thanks. Someone from Flexiple will email you within one working day." No real email is sent.
**Acceptance:** link reloads the same plan; printed PDF fits A4 with citations.

## Non-functional
- Desktop-first (1280-1440 px) but usable at 390 px.
- First load < 2 s on Vercel; navigator re-rank < 50 ms.
- No number on any screen without a source or an "Estimate" label.
- Accessibility: labels on all inputs, focus states, contrast AA.

## Demo script (3 minutes)
1. **Truth table (40 s):** "How many GCCs in India?" Seven answers, 1,700 to 2,000+. Toggle centres: 2,975. Switch to Bengaluru: 487 vs 875+ vs ~950. Read the "why they differ" note.
2. **Navigator (70 s):** Load demo company. Pune > Hyderabad > Bengaluru; Chennai under "Not enough data" (honest). TN not eligible (Global 2000 + 200 staff). Karnataka only outside Bengaluru. Click "Talent depth": Bengaluru climbs from 31.8 to 50.9. 3-yr cost table.
3. **Ask (30 s):** "What would Maharashtra pay me?" Cited answer with chips.
4. **Add a source (30 s):** load Telangana sample, extract, show quote highlight, approve.
5. **Export (10 s):** save plan, show sources list, the CTA form.

## Out of scope (v0.1)
Auth/accounts, provider marketplace or ratings, state dashboards, company-level GCC database, non-India scope, price quotes, real email sending, maps (nice-to-have only), scraping PII, multi-language.

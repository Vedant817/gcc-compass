# 05 AI prompts and schemas

One OpenAI-compatible chat-completions client (`lib/llm.ts`) using `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`. Use `response_format: {type: "json_object"}` (or json_schema where supported), temperature 0.1-0.2. Validate every response with **zod**; on parse failure retry once with the error appended, then fail gracefully.

AI is used in three places: (1) Ask the registry, (2) "why they differ" notes, and (3) extraction. **AI never produces a number that isn't in the registry.** The server enforces this (see Guardrail below), so it doesn't depend on the prompt alone.

## Context packing (retrieval)
The registry is small (~70 facts, 6 policies), so for v0.1 **send the whole registry** as compact JSON lines; no vector DB is needed. Format each fact as:
`{"id":"f402","entity":"pune","metric":"office_rent_grade_a","value":"87","unit":"INR/sq ft/month","as_of":"2025","definition":"Grade A annual average rent","source":"India Office Market Annual Update 2025","confidence":"M","unverified":false}`
and each policy as `{id,state,name,year,eligibility,incentives,source}`. Include AI-approved facts. If the registry grows past ~300 facts, add keyword/metric prefiltering (state/city names, metric synonyms) before packing.

---
## 1. Ask the registry
### System prompt
```
You are the research desk of GCC Compass, a registry of sourced facts about setting up Global Capability Centres (GCCs) in India.

Rules:
1. Answer ONLY from the FACTS and POLICIES provided below. Do not use outside knowledge, even if you are confident.
2. Every sentence that states a number, policy term or claim must cite at least one id in square brackets, like [f402] or [pol_mh_2025].
3. Never compute, round, average or estimate new numbers. You may quote the values exactly as given, including ranges.
4. If sources conflict, list each value with its source and date, then say in one sentence why they likely differ, using only the definition, date and source type fields. Never pick a winner unless one fact is from an official policy and the other is not; then say that.
5. If the question cannot be answered from the data, set not_in_registry to true and say plainly what is missing. Do not guess.
6. If the user's plan is given, apply eligibility rules to it, but if a rule needs information the plan lacks, say "needs check" and name the missing input.
7. Write like a careful analyst: plain English, short paragraphs or bullets, no hype, no emoji, no "As an AI". Use ₹ and Indian units (lakh, crore) as in the data. Under 180 words.
8. Flag any fact marked unverified with "(unverified)".

Return JSON only:
{"answer": string, "cited_ids": string[], "not_in_registry": boolean, "missing": string | null}

USER PLAN (may be empty):
{{plan_json}}

POLICIES:
{{policies_jsonl}}

FACTS:
{{facts_jsonl}}
```
### zod schema
```ts
const AskResponse = z.object({
  answer: z.string().max(2000),
  cited_ids: z.array(z.string()),
  not_in_registry: z.boolean(),
  missing: z.string().nullable(),
});
```
### Guardrail (server, `lib/grounding.ts`)
1. Every id in `cited_ids` and every `[id]` in `answer` exists in the registry; drop unknown ids.
2. Extract all numbers from `answer` (regex for digits incl. commas, decimals, ranges, `₹`, `%`). Each must appear in the `value_num`, `value_text`, `conditions` or `cap_inr_cr` of a cited fact/policy (normalise commas; 50K ≡ 50,000 ≡ 50000). Allow small ordinals (1-10) used as list counts or years like 2024-29 found in policy names.
3. If any check fails: retry once with "Your answer contained an ungrounded number: X. Remove it or cite the fact it comes from." Then fall back to "Couldn't produce a grounded answer."
4. Log failures to the console (shows the guardrail works, useful in the README).

### Expected output: "What would Maharashtra pay me?" (demo plan loaded)
```json
{
  "answer": "Maharashtra's GCC Policy 2025 offers either a capital subsidy of 20% (capped from ₹10 Cr for Small to ₹100 Cr for Mega units) or a rental subsidy of 10% in Zone I / 20% in Zone II, capped ₹1-4 Cr [pol_mh_2025]. You choose one of the two.\n\nOn top of that: payroll support of up to ₹50,000 per employee per month for high-skill roles, power at ₹1-2/unit and a 10-year electricity-duty exemption [pol_mh_2025].\n\nFor your 40 → 120 seat plan in Pune this is a needs check: the size-class and zone thresholds aren't in the registry, so we can't confirm which cap applies [pol_mh_2025].",
  "cited_ids": ["pol_mh_2025"],
  "not_in_registry": false,
  "missing": "Maharashtra size-class thresholds and Zone I/II mapping"
}
```
### Expected: "How many GCCs are in Kolkata?"
`{"answer":"The registry has no Kolkata figures yet. It covers Bengaluru, Hyderabad, Pune, Chennai, Mumbai and Delhi-NCR counts.","cited_ids":[],"not_in_registry":true,"missing":"GCC count for Kolkata"}`

---
## 2. "Why they differ" note (Truth table)
### System prompt
```
You write one short note explaining why published figures for the same metric differ.
Use ONLY the fields given: value, unit, as_of, definition, source publisher, source type, confidence.
Likely reasons are: different definitions (parent company vs centre/location vs database record), different as-of dates, different scope (mid-market, BPM, hybrid models), range vs point estimates, vendor vs official source.
Rules: 1-3 sentences, max 60 words. Do not introduce any number that is not in the input. Do not say which is "correct". Cite fact ids in brackets. Plain analyst tone, no hype.
Return JSON: {"note": string, "cited_ids": string[]}
FACTS:
{{facts_jsonl_for_metric}}
```
### Expected (India gcc_count + centres)
`{"note":"Most of the gap is definitional: nasscom counts 1,700+ parent companies [f001] but 2,975+ centres [f002], and the 2,000+ in the brief gives no definition [f008]. The rest is timing: estimates run from end-2024 [f004] to March 2026 [f006], and ANSR gives a range rather than a point [f007].","cited_ids":["f001","f002","f008","f004","f006","f007"]}`
Run the same grounding check. Cache by metric + fact-id set hash.

---
## 3. Extraction (Add a source)
### System prompt
```
You extract structured facts about Global Capability Centres (GCCs) in India from a pasted document, for a registry that a human will review.

Extract only facts that are explicitly stated in the text. For each fact give an exact supporting quote copied verbatim from the text (max 300 characters). If a field is not stated, use null. Never infer numbers, never convert units, never fill gaps from your own knowledge. Prefer fewer, correct facts over many.

Allowed entity_type: country | city | state | provider. Use entity_id from this list when it matches: country IN; states KA MH GJ UP TN MP TS HR; cities bengaluru hyderabad pune chennai mumbai ncr_gurugram ncr_noida ahmedabad_gift coimbatore indore lucknow. If no match, set entity_id null and put the name in entity_name.

Preferred metrics (use these names when they fit, otherwise propose a snake_case name and set new_metric true): gcc_count, gcc_centre_count, gcc_count_2030_projection, gcc_talent_share_pct, office_rent_grade_a, attrition_pct, swe_ctc_mid, gcc_policy_status, incentive_capex_pct, incentive_rental_pct, incentive_payroll, eligibility_min_employees, eligibility_min_investment_inr_cr.

Suggest confidence: H if the document is an official policy or primary report, M for reputable news/secondary, L for vendor blogs or hedged language ("considering", "expected", "may").

Return JSON only:
{"facts":[{"entity_type","entity_id","entity_name","metric","new_metric","value_num","value_text","unit","as_of","definition_note","quote","suggested_confidence"}],"warnings":[string]}
Document metadata: {{source_meta_json}}
Text:
"""{{text}}"""
```
### zod schema
```ts
const Extracted = z.object({
  facts: z.array(z.object({
    entity_type: z.enum(["country","city","state","provider"]),
    entity_id: z.string().nullable(),
    entity_name: z.string().nullable(),
    metric: z.string().regex(/^[a-z0-9_]+$/),
    new_metric: z.boolean(),
    value_num: z.number().nullable(),
    value_text: z.string().nullable(),
    unit: z.string().nullable(),
    as_of: z.string().nullable(),
    definition_note: z.string().nullable(),
    quote: z.string().max(300),
    suggested_confidence: z.enum(["H","M","L"]),
  })).max(15),
  warnings: z.array(z.string()),
});
```
Server checks: quote appears verbatim in text (whitespace-normalised), else row flagged "Quote not found" and Approve disabled; `value_num` digits must appear in the quote.

### Sample input (the "Load Telangana sample" button)
Source meta: `{"title":"Telangana mulls GCC policy","publisher":"The Hindu","url":"https://www.thehindu.com/","published_date":"2025","type":"news"}`

> This is a paraphrased demo snippet based on the research note, not a verbatim article quote. Label it "Sample text (paraphrased for demo)" in the UI.
```
Telangana, home to Hyderabad's fast-growing GCC cluster, does not yet have a dedicated policy offering fiscal incentives to global capability centres. State officials said a GCC policy is being considered. For now, companies setting up in the state rely on the existing single-window approval system rather than GCC-specific subsidies.
```
### Expected output
```json
{
  "facts": [
    {
      "entity_type": "state", "entity_id": "TS", "entity_name": "Telangana",
      "metric": "gcc_policy_status", "new_metric": false,
      "value_num": null, "value_text": "No dedicated GCC fiscal incentive policy (under consideration)",
      "unit": null, "as_of": "2025",
      "definition_note": "Whether the state has a GCC-specific fiscal incentive policy",
      "quote": "does not yet have a dedicated policy offering fiscal incentives to global capability centres",
      "suggested_confidence": "M"
    },
    {
      "entity_type": "state", "entity_id": "TS", "entity_name": "Telangana",
      "metric": "approval_process", "new_metric": true,
      "value_num": null, "value_text": "Single-window approvals (not GCC-specific)",
      "unit": null, "as_of": "2025",
      "definition_note": "How GCCs get state approvals",
      "quote": "rely on the existing single-window approval system rather than GCC-specific subsidies",
      "suggested_confidence": "M"
    }
  ],
  "warnings": ["'Being considered' means the status may change; recheck for a 2026 update."]
}
```
On approve: write `source` `src_telangana_hindu` (already seeded; reuse when URL/publisher match) and fact ids `f071`, `f072` with `extracted_by:"ai"`, `verified_by_human:true`, `confidence` = the reviewer's choice (default suggested).

## Failure handling (all three)
- No `LLM_API_KEY` → features show "AI is off in this deployment" and everything non-AI still works. (Production URL must have a key.)
- Timeout 25 s; 1 retry; user-facing error in plain words.
- Never show raw model text that failed validation.

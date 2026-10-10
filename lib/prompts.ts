/**
 * Prompts from 05_ai_prompts.md, verbatim, with the placeholder filling done
 * here. AI is used in exactly three places: Ask the registry, "why they
 * differ" notes, and extraction.
 */
import type { Policy, RegistryView } from "./registry";

export function factLine(reg: RegistryView, f: import("./types").Fact): string {
  const src = reg.source(f.source_id);
  return JSON.stringify({
    id: f.id,
    entity: f.entity_id,
    metric: f.metric,
    value: f.value_text ?? (f.value_num === null ? null : String(f.value_num)),
    unit: f.unit,
    as_of: f.as_of,
    definition: f.definition_note,
    source: src ? src.title : f.source_id,
    confidence: f.confidence,
    unverified: f.unverified,
  });
}

export function factsJsonl(reg: RegistryView, facts: import("./types").Fact[]): string {
  return facts.map((f) => factLine(reg, f)).join("\n");
}

export function policyLine(reg: RegistryView, p: Policy): string {
  const src = reg.source(p.source_id);
  return JSON.stringify({
    id: p.id,
    state: p.state_id,
    name: p.name,
    year: p.year,
    eligibility: p.eligibility_json,
    incentives: p.incentives_json,
    source: src ? src.title : p.source_id,
  });
}

export function policiesJsonl(reg: RegistryView, policies: Policy[] = reg.policies): string {
  return policies.map((p) => policyLine(reg, p)).join("\n");
}

/* ---------------------------------- Ask ---------------------------------- */

const ASK_SYSTEM = `You are the research desk of GCC Compass, a registry of sourced facts about setting up Global Capability Centres (GCCs) in India.

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
{{facts_jsonl}}`;

export function buildAskSystem(reg: RegistryView, planJson: string): string {
  return ASK_SYSTEM.replace("{{plan_json}}", planJson || "(none)")
    .replace("{{policies_jsonl}}", policiesJsonl(reg))
    .replace("{{facts_jsonl}}", factsJsonl(reg, reg.facts));
}

/* ----------------------------- Why they differ ---------------------------- */

const WHY_SYSTEM = `You write one short note explaining why published figures for the same metric differ.
Use ONLY the fields given: value, unit, as_of, definition, source publisher, source type, confidence.
Likely reasons are: different definitions (parent company vs centre/location vs database record), different as-of dates, different scope (mid-market, BPM, hybrid models), range vs point estimates, vendor vs official source.
Rules: 1-3 sentences, max 60 words. Do not introduce any number that is not in the input. Do not say which is "correct". Cite fact ids in brackets. Plain analyst tone, no hype.
Return JSON: {"note": string, "cited_ids": string[]}
FACTS:
{{facts_jsonl}}`;

export function buildWhySystem(reg: RegistryView, facts: import("./types").Fact[]): string {
  return WHY_SYSTEM.replace("{{facts_jsonl}}", factsJsonl(reg, facts));
}

/* -------------------------------- Extraction ------------------------------ */

const EXTRACT_SYSTEM = `You extract structured facts about Global Capability Centres (GCCs) in India from a pasted document, for a registry that a human will review.

Extract only facts that are explicitly stated in the text. For each fact give an exact supporting quote copied verbatim from the text (max 300 characters). If a field is not stated, use null. Never infer numbers, never convert units, never fill gaps from your own knowledge. Prefer fewer, correct facts over many.

Allowed entity_type: country | city | state | provider. Use entity_id from this list when it matches: country IN; states KA MH GJ UP TN MP TS HR; cities bengaluru hyderabad pune chennai mumbai ncr_gurugram ncr_noida ahmedabad_gift coimbatore indore lucknow. If no match, set entity_id null and put the name in entity_name.

Preferred metrics (use these names when they fit, otherwise propose a snake_case name and set new_metric true): gcc_count, gcc_centre_count, gcc_count_2030_projection, gcc_talent_share_pct, office_rent_grade_a, attrition_pct, swe_ctc_mid, gcc_policy_status, incentive_capex_pct, incentive_rental_pct, incentive_payroll, eligibility_min_employees, eligibility_min_investment_inr_cr.

Suggest confidence: H if the document is an official policy or primary report, M for reputable news/secondary, L for vendor blogs or hedged language ("considering", "expected", "may").

Return JSON only:
{"facts":[{"entity_type","entity_id","entity_name","metric","new_metric","value_num","value_text","unit","as_of","definition_note","quote","suggested_confidence"}],"warnings":[string]}
Document metadata: {{source_meta_json}}
Text:
"""{{text}}"""`;

export function buildExtractSystem(meta: Record<string, unknown>, text: string): string {
  return EXTRACT_SYSTEM.replace("{{source_meta_json}}", JSON.stringify(meta)).replace(
    "{{text}}",
    text,
  );
}

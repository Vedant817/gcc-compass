/**
 * Server-side grounding guardrail (05). Every number in an AI answer must
 * appear in a cited fact or policy, so the model cannot invent figures.
 * Numbers are allowed from: fact value_num/value_text/definition wording,
 * policy incentive conditions/caps/durations/names/years, eligibility rule
 * values and reasons, source publication dates, the user's own plan inputs,
 * small ordinals (1-10) and plausible years (2020-2035) which are not data
 * claims.
 */
import type { RegistryView } from "./registry";

export interface GroundingResult {
  ok: boolean;
  ungrounded: string[];
  resolvedIds: string[];
}

const TOKEN_RE = /(?<![A-Za-z0-9._])(\d{1,3}(?:,\d{2,3})*(?:\.\d+)?|\d+(?:\.\d+)?)(?![A-Za-z0-9])/g;

/** All numeric tokens in a text, with their parsed values. */
export function extractNumbers(text: string): { token: string; value: number }[] {
  const out: { token: string; value: number }[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const token = m[1];
    let t = token.replace(/,/g, "");
    let mult = 1;
    const k = /^(\d+(?:\.\d+)?)([Kk])$/.exec(t);
    if (k) {
      t = k[1];
      mult = 1000;
    }
    const v = parseFloat(t) * mult;
    if (Number.isFinite(v)) out.push({ token, value: v });
  }
  // "50K" style with a space: handled by the preceding regex only when the K
  // is attached; also normalise standalone "660 K" patterns.
  for (const m of text.matchAll(/(?<![A-Za-z0-9.])(\d+(?:\.\d+)?)\s?[Kk](?![A-Za-z])/g)) {
    const v = parseFloat(m[1]) * 1000;
    if (Number.isFinite(v)) out.push({ token: `${m[1]}K`, value: v });
  }
  return out;
}

function key(v: number): string {
  // collapse 1.0 / 1 / 1.00 to one canonical key
  return String(Math.round(v * 1e6) / 1e6);
}

function addAll(target: Set<string>, text: string): void {
  for (const n of extractNumbers(text)) target.add(key(n.value));
}

function isYear(v: number): boolean {
  return v >= 2020 && v <= 2035 && Number.isInteger(v);
}

export function allowedNumbers(reg: RegistryView, ids: string[], planJson?: string): Set<string> {
  const allowed = new Set<string>();
  for (const id of ids) {
    const f = reg.fact(id);
    if (f) {
      if (f.value_num !== null) allowed.add(key(f.value_num));
      if (f.value_text) addAll(allowed, f.value_text);
      if (f.definition_note) addAll(allowed, f.definition_note);
      addAll(allowed, f.as_of);
      const src = reg.source(f.source_id);
      if (src?.published_date) addAll(allowed, src.published_date);
      continue;
    }
    const p = reg.policy(id);
    if (p) {
      if (p.year) addAll(allowed, String(p.year));
      addAll(allowed, p.name);
      if (p.summary) addAll(allowed, p.summary);
      for (const inc of p.incentives_json) {
        if (inc.pct !== null) allowed.add(key(inc.pct));
        if (inc.cap_inr_cr !== null) allowed.add(key(inc.cap_inr_cr));
        if (inc.duration_yrs !== null) allowed.add(key(inc.duration_yrs));
        addAll(allowed, inc.conditions);
      }
      for (const r of p.eligibility_json.all) {
        if (typeof r.value === "number") allowed.add(key(r.value));
        addAll(allowed, r.fail_reason);
      }
      for (const s of p.eligibility_json.needs_check) addAll(allowed, s);
      const src = reg.source(p.source_id);
      if (src?.published_date) addAll(allowed, src.published_date);
    }
  }
  // the user's own plan inputs are legitimate numbers to echo back
  if (planJson) addAll(allowed, planJson);
  return allowed;
}

/** Ids cited in the answer text ([f402] / [pol_mh_2025]) plus listed cited ids. */
export function resolveCitations(reg: RegistryView, citedIds: string[], answer: string): string[] {
  const ids = new Set<string>();
  for (const m of answer.matchAll(/\[((?:f|pol|f\d)[A-Za-z0-9_]+)\]/g)) ids.add(m[1]);
  for (const id of citedIds) ids.add(id);
  return [...ids].filter((id) => Boolean(reg.fact(id) || reg.policy(id)));
}

export function checkGrounded(
  answer: string,
  citedIds: string[],
  reg: RegistryView,
  planJson?: string,
): GroundingResult {
  const resolvedIds = resolveCitations(reg, citedIds, answer);
  const allowed = allowedNumbers(reg, resolvedIds, planJson);
  const ungrounded: string[] = [];
  for (const n of extractNumbers(answer)) {
    const v = n.value;
    const ok =
      allowed.has(key(v)) ||
      (Number.isInteger(v) && v >= 1 && v <= 10) || // list counts / ordinals
      isYear(v); // years are labels, not data claims
    if (!ok) ungrounded.push(n.token);
  }
  return { ok: ungrounded.length === 0, ungrounded: [...new Set(ungrounded)], resolvedIds };
}

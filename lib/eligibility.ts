import type { Policy, Rule } from "./types";

export type EligibilityStatus = "eligible" | "needs_check" | "not_eligible";

export interface PolicyEligibility {
  policyId: string;
  status: EligibilityStatus;
  reasons: string[];
}

type RuleValue = string | number | boolean | string[];
export type RuleInputs = Record<string, unknown>;

/**
 * Rules engine from 04 §5. Inputs are the navigator inputs plus city_id.
 * A missing input is "needs check", never a silent pass or fail.
 */
/**
 * The plan fields a rule can ask about, named the way a person filling in the
 * navigator form would name them. A missing input is "needs check" and has to be
 * asked for in those words: the raw key (investment_inr_cr) is our naming, not
 * something the user ever typed.
 */
const FIELD_LABELS: Record<string, string> = {
  hq_country: "HQ country",
  company_size: "company size",
  global2000: "whether you're a Global 2000 company",
  seats_y1: "year-1 seats",
  seats_y3: "year-3 seats",
  functions: "functions",
  open_to_tier2: "whether you're open to Tier-2 cities",
  investment_inr_cr: "planned India investment",
  city_id: "city",
};

export function evaluateRule(rule: Rule, inputs: RuleInputs): { status: EligibilityStatus; reason?: string } {
  const v = inputs[rule.field];
  if (v === undefined || v === null) {
    const label = FIELD_LABELS[rule.field] ?? rule.field.replace(/_/g, " ");
    return {
      status: "needs_check",
      reason: `We'd need your ${label} to check this: ${rule.fail_reason}`,
    };
  }
  const t = rule.value as RuleValue;
  let ok: boolean;
  switch (rule.op) {
    case "==":
      ok = v === t;
      break;
    case "!=":
      ok = v !== t;
      break;
    case ">=":
      ok = Number(v) >= Number(t);
      break;
    case "<=":
      ok = Number(v) <= Number(t);
      break;
    case "in":
      ok = (t as string[]).includes(String(v));
      break;
    case "not_in":
      ok = !(t as string[]).includes(String(v));
      break;
    default:
      ok = false;
  }
  return ok ? { status: "eligible" } : { status: "not_eligible", reason: rule.fail_reason };
}

export function evaluatePolicy(policy: Policy, inputs: RuleInputs): PolicyEligibility {
  const results = policy.eligibility_json.all.map((r) => evaluateRule(r, inputs));
  const fails = results
    .filter((r) => r.status === "not_eligible")
    .map((r) => r.reason)
    .filter((x): x is string => Boolean(x));
  if (fails.length) return { policyId: policy.id, status: "not_eligible", reasons: fails };
  const checks = [
    ...results.filter((r) => r.status === "needs_check").map((r) => r.reason as string),
    ...policy.eligibility_json.needs_check,
  ];
  if (checks.length) return { policyId: policy.id, status: "needs_check", reasons: checks };
  return { policyId: policy.id, status: "eligible", reasons: ["All registry rules pass."] };
}

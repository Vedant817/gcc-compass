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
export function evaluateRule(rule: Rule, inputs: RuleInputs): { status: EligibilityStatus; reason?: string } {
  const v = inputs[rule.field];
  if (v === undefined || v === null) {
    return { status: "needs_check", reason: `Need your ${rule.field} to check: ${rule.fail_reason}` };
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

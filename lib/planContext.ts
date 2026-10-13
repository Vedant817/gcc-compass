import type { NavigatorInputs, Policy } from "./types";

/**
 * What the Ask answer is allowed to say about the size class of a plan.
 *
 * Maharashtra's capital subsidy is capped from ₹10 Cr (Small) to ₹100 Cr (Mega)
 * [pol_mh_2025], and which cap applies is decided by the size class a company
 * falls into. The registry records the caps but not the Small-to-Mega thresholds,
 * and pol_mh_2025 says so itself in its own needs-check list. So the size class is
 * derived only when the policy declares the bands, and otherwise the gap is
 * reported in the registry's own words — never guessed.
 */

/** One band of the size-class ladder the policy declares. */
export interface SizeClassBand {
  class: string;
  /** the plan needs at least this many seats in year 3 */
  min_seats: number | null;
  /** and at least this much investment, in ₹ crore */
  min_investment_inr_cr: number | null;
}

export interface SizeClassAnswer {
  /** the policy that owns the bands */
  policyId: string;
  /** the class the plan falls into, or null when it can't be determined */
  className: string | null;
  /** the bands the policy declares, highest first */
  bands: SizeClassBand[];
  /** which plan values were used, for the prompt */
  seats_y3: number | null;
  investment_inr_cr: number | null;
  /** why the class could not be determined, in the registry's own words */
  gap: string | null;
}

/** Bands a policy declares. Empty when the registry has no thresholds. */
export function readSizeClassBands(policy: Policy): SizeClassBand[] {
  const raw = policy.size_class_thresholds ?? [];
  return [...raw].sort((a, b) => {
    const bySeats = (b.min_seats ?? -1) - (a.min_seats ?? -1);
    if (bySeats !== 0) return bySeats;
    return (b.min_investment_inr_cr ?? -1) - (a.min_investment_inr_cr ?? -1);
  });
}

/**
 * Classify a plan against a ladder of bands.
 *
 * A band is met when the plan reaches every threshold the band names. Bands are
 * checked top down, so the first one met is the highest class the plan qualifies
 * for. Bands that name no threshold are ignored: they can't be tested.
 */
export function classifySizeClass(
  bands: SizeClassBand[],
  inputs: NavigatorInputs,
): string | null {
  for (const band of bands) {
    const seatsBand = band.min_seats;
    const investBand = band.min_investment_inr_cr;
    if (seatsBand === null && investBand === null) continue;
    if (seatsBand !== null && !(inputs.seats_y3 >= seatsBand)) continue;
    if (investBand !== null && (inputs.investment_inr_cr ?? 0) < investBand) continue;
    return band.class;
  }
  return null;
}

/** The Maharashtra policy, if the registry has one. */
function maharashtraPolicy(policies: Policy[]): Policy | null {
  return policies.find((p) => p.state_id === "MH" && /maharashtra/i.test(p.name)) ?? null;
}
/**
 * Answer for one plan. When the policy declares no bands, `gap` carries the
 * registry's own needs-check line so the model can quote it instead of inventing
 * a threshold.
 */
export function sizeClassForPlan(
  policies: Policy[],
  inputs: NavigatorInputs | null,
): SizeClassAnswer | null {
  const policy = maharashtraPolicy(policies);
  if (!policy || !inputs) return null;
  const bands = readSizeClassBands(policy);
  const base = {
    policyId: policy.id,
    bands,
    seats_y3: inputs.seats_y3,
    investment_inr_cr: inputs.investment_inr_cr,
  };
  if (bands.length === 0) {
    // The policy says it plainly in its own needs-check list; use its words.
    const own = policy.eligibility_json.needs_check.find((n) => /size class/i.test(n));
    return {
      ...base,
      className: null,
      gap: own ?? `${policy.id} carries no size-class thresholds.`,
    };
  }
  return { ...base, className: classifySizeClass(bands, inputs), gap: null };
}

/**
 * The line the Ask prompt gets. Either a grounded class with the thresholds used,
 * or a plain statement that the class can't be worked out — which is what keeps
 * the model from quoting ₹100 Cr to a company that qualifies for ₹10 Cr.
 */
export function planContextForAsk(
  policies: Policy[],
  inputs: NavigatorInputs | null,
): string {
  const answer = sizeClassForPlan(policies, inputs);
  if (!answer) return "(not applicable)";
  if (answer.className) {
    const used: string[] = [`year-3 seats ${answer.seats_y3}`];
    if (answer.investment_inr_cr !== null) used.push(`investment ₹${answer.investment_inr_cr} Cr`);
    return [
      `Maharashtra size class for this plan: ${answer.className} (from ${used.join(", ")}).`,
      `Bands declared by ${answer.policyId}: ${answer.bands
        .map((b) => `${b.class} (${[
          b.min_seats !== null ? `${b.min_seats}+ seats` : null,
          b.min_investment_inr_cr !== null ? `₹${b.min_investment_inr_cr} Cr+` : null,
        ]
          .filter(Boolean)
          .join(" and ")})`)
        .join("; ")}.`,
      `Quote only the cap that applies to ${answer.className}.`,
    ].join(" ");
  }
  return [
    `Maharashtra size class for this plan (year-3 seats ${answer.seats_y3}` +
      (answer.investment_inr_cr !== null ? `, investment ₹${answer.investment_inr_cr} Cr` : "") +
      "): not determinable.",
    `${answer.policyId} does not carry the Small-to-Mega thresholds, so no cap can be quoted for this plan.`,
    `Say so plainly and name the missing input: ${answer.gap}`,
  ].join(" ");
}

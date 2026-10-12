import { evaluatePolicy, type PolicyEligibility } from "./eligibility";
import { RENT_SOURCE_ID, type RegistryView } from "./registry";
import type { NavigatorInputs, PresetKey, Weights } from "./types";

/** Weights from 04 §4 (percent, each preset sums to 100). */
export const PRESET_WEIGHTS: Record<PresetKey, Weights> = {
  cost: { talent: 20, rent: 20, salary: 35, attrition: 15, incentives: 10 },
  talent: { talent: 45, rent: 10, salary: 15, attrition: 20, incentives: 10 },
  incentives: { talent: 20, rent: 15, salary: 15, attrition: 10, incentives: 40 },
  balanced: { talent: 25, rent: 20, salary: 25, attrition: 15, incentives: 15 },
};

export const COMPONENTS = ["talent", "rent", "salary", "attrition", "incentives"] as const;
export type Component = (typeof COMPONENTS)[number];

export const MIN_COVERAGE = 0.6;

/** Lower is better for these (04 §3). */
const LOWER_IS_BETTER: Record<Component, boolean> = {
  talent: false,
  rent: true,
  salary: true,
  attrition: true,
  incentives: false,
};

export interface CityRaw {
  talent: number | null;
  rent: number | null;
  salary: number | null;
  attrition: number | null;
  incentives: number;
}

export interface RankedCity {
  city: string;
  coverage: number;
  score: number | null;
  components: Record<Component, number | null>;
  raw: CityRaw;
  eligibility: PolicyEligibility[];
}

export function normaliseWeights(w: Weights): Weights {
  const sum = COMPONENTS.reduce((s, k) => s + (w[k] || 0), 0);
  if (sum <= 0) return PRESET_WEIGHTS.balanced;
  const out = {} as Weights;
  for (const k of COMPONENTS) out[k] = (w[k] || 0) / sum;
  return out;
}

export function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
export function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/**
 * Raw component values for one city, straight from the registry (04 §2).
 * Rent uses only src_office_annual_2025 so every city shares one methodology.
 */
export function cityRaw(
  reg: RegistryView,
  cityId: string,
  inputs: NavigatorInputs,
): { raw: CityRaw; eligibility: PolicyEligibility[] } {
  const blrMid = reg.numericFact("bengaluru", "swe_ctc_mid")?.value_num ?? null;
  const rent = reg.numericFact(cityId, "office_rent_grade_a", RENT_SOURCE_ID);
  const talent = reg.numericFact(cityId, "gcc_talent_share_pct");
  const attr = reg.numericFact(cityId, "attrition_pct");

  let salary: number | null = null;
  if (cityId === "bengaluru") salary = blrMid;
  else {
    const d = reg.numericFact(cityId, "swe_ctc_discount_vs_blr_pct");
    if (d && d.value_num !== null && blrMid !== null) salary = blrMid * (1 - d.value_num / 100);
  }

  const city = reg.city(cityId);
  const statePolicies = city ? reg.policiesForState(city.state_id) : [];
  let incentives = 0.0;
  const eligibility: PolicyEligibility[] = [];
  const ruleInputs: Record<string, unknown> = { ...inputs, city_id: cityId };
  for (const p of statePolicies) {
    const res = evaluatePolicy(p, ruleInputs);
    eligibility.push(res);
    incentives = Math.max(incentives, res.status === "eligible" ? 1.0 : res.status === "needs_check" ? 0.5 : 0.0);
  }

  return {
    raw: {
      talent: talent && talent.value_num !== null ? talent.value_num : null,
      rent: rent && rent.value_num !== null ? rent.value_num : null,
      salary,
      attrition: attr && attr.value_num !== null ? attr.value_num : null,
      incentives,
    },
    eligibility,
  };
}

/**
 * Rank cities (04 §3-4). Missing values stay null, never imputed; cities below
 * the coverage threshold are returned unranked (score null) so the UI can say
 * "Not enough data to rank" and name the missing components.
 */
export function rank(reg: RegistryView, inputs: NavigatorInputs, weights: Weights): RankedCity[] {
  const w = normaliseWeights(weights);
  const candidates = reg.cities.filter((c) => c.tier === 1 || inputs.open_to_tier2);
  const raws = candidates.map((c) => ({ city: c.id, ...cityRaw(reg, c.id, inputs) }));

  const norm: Record<string, Record<Component, number | null>> = {};
  for (const k of COMPONENTS) {
    const vals = raws.map((r) => r.raw[k]).filter((v): v is number => v !== null);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    for (const r of raws) {
      const v = r.raw[k];
      let x: number | null = null;
      if (v !== null) {
        const raw = hi === lo ? 1 : (v - lo) / (hi - lo);
        x = LOWER_IS_BETTER[k] ? 1 - raw : raw;
      }
      norm[r.city] = norm[r.city] ?? ({} as Record<Component, number | null>);
      norm[r.city][k] = x;
    }
  }

  const out: RankedCity[] = raws.map((r) => {
    const coverage = COMPONENTS.reduce((s, k) => (norm[r.city][k] !== null ? s + w[k] : s), 0);
    const weighted = COMPONENTS.reduce(
      (s, k) => (norm[r.city][k] !== null ? s + w[k] * (norm[r.city][k] as number) : s),
      0,
    );
    const score = coverage > 0 ? (weighted / coverage) * 100 : 0;
    return {
      city: r.city,
      coverage: round2(coverage),
      score: coverage >= MIN_COVERAGE ? round1(score) : null,
      components: Object.fromEntries(
        COMPONENTS.map((k) => [k, norm[r.city][k] === null ? null : round3(norm[r.city][k] as number)]),
      ) as Record<Component, number | null>,
      raw: r.raw,
      eligibility: r.eligibility,
    };
  });

  out.sort(
    (a, b) =>
      (a.score === null ? 1 : 0) - (b.score === null ? 1 : 0) || (b.score ?? 0) - (a.score ?? 0),
  );
  return out;
}

/** Which components are missing for a city (used by the "not enough data" list). */
export function missingComponents(raw: CityRaw): Component[] {
  return COMPONENTS.filter((k) => raw[k] === null);
}


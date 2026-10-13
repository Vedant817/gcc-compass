/**
 * The entity ids the extraction prompt and the review UI are allowed to map
 * to (from 05), derived from the seed so the list can never drift from it.
 */
import { seedRegistry } from "@/lib/registry";

export const ALLOWED_ENTITY_IDS = new Set<string>([
  "IN",
  ...seedRegistry.states.map((s) => s.id),
  ...seedRegistry.cities.map((c) => c.id),
]);

/**
 * Metric ids in the words a reviewer would use. The raw key is our internal name;
 * a row on the review screen should read "GCC policy status", not
 * "gcc_policy_status", the same way the truth table names things.
 */
/**
 * What each metric means, for the review screen's Definition line. The model
 * often leaves definition_note empty, and "—" tells a reviewer nothing about what
 * they are approving; these are the same definitions the truth table uses.
 */
export const METRIC_DEFINITIONS: Record<string, string> = {
  gcc_count: "Companies counted as having a GCC centre in India",
  gcc_centre_count: "Individual centres or units, where one company can run several",
  gcc_count_records: "GCC mentions in an employer database, one record per company",
  gcc_count_2030_projection: "Projected GCC count for 2030",
  gcc_talent_share_pct: "Share of a city's tech workforce at GCC companies",
  office_rent_grade_a: "Monthly rent per sq ft for Grade A office space",
  attrition_pct: "Annual attrition rate at GCCs in the city",
  swe_ctc_mid: "Annual cost to company of a mid-level software engineer",
  swe_ctc_discount_vs_blr_pct: "Mid-level salary versus Bengaluru",
  gcc_policy_status: "Whether the state has a GCC fiscal incentive policy",
  approval_process: "How a GCC gets state approvals",
  incentive_capex_pct: "Capital expenditure subsidy",
  incentive_rental_pct: "Rental subsidy",
  incentive_payroll: "Support paid per employee per month",
  eligibility_min_employees: "Minimum employees the policy needs",
  eligibility_min_investment_inr_cr: "Minimum investment the policy needs",
};

export const METRIC_LABELS: Record<string, string> = {
  gcc_count: "GCC count",
  gcc_centre_count: "GCCs and centres",
  gcc_count_records: "GCCs per database record",
  gcc_count_2030_projection: "2030 GCC projection",
  gcc_talent_share_pct: "GCC talent share",
  office_rent_grade_a: "Grade A office rent",
  attrition_pct: "Attrition",
  swe_ctc_mid: "Mid-level salary",
  swe_ctc_discount_vs_blr_pct: "Salary vs Bengaluru",
  gcc_policy_status: "GCC policy status",
  approval_process: "Approval process",
  incentive_capex_pct: "Capital subsidy",
  incentive_rental_pct: "Rental subsidy",
  incentive_payroll: "Payroll support",
  eligibility_min_employees: "Minimum employees",
  eligibility_min_investment_inr_cr: "Minimum investment",
};

/** Human name for a metric id, falling back to reading the key out in words. */
export function metricLabel(metric: string): string {
  const known = METRIC_LABELS[metric];
  if (known) return known;
  return metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * The definition to show for a row. The model's own note wins, since it describes
 * what this source actually meant; otherwise the metric's standing definition, so
 * the line says what the fact measures instead of showing a dash.
 */
export function metricDefinition(metric: string, note?: string | null): string {
  if (note && note.trim()) return note;
  return METRIC_DEFINITIONS[metric] ?? `What "${metricLabel(metric)}" measures`;
}

/** "Telangana" for TS, "Bengaluru" for bengaluru, the type name for the rest. */
export function entityLabel(
  entityType: string,
  entityId: string | null,
  entityName: string | null,
): string {
  if (entityName) return entityName;
  if (!entityId) return entityType;
  const state = seedRegistry.states.find((s) => s.id === entityId);
  if (state) return state.name;
  const city = seedRegistry.cities.find((c) => c.id === entityId);
  if (city) return city.name;
  if (entityId === "IN") return "India";
  return entityId;
}

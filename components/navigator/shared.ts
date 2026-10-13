import type { FunctionKeyT, NavigatorInputs } from "@/lib/types";

export const FUNCTIONS: { key: FunctionKeyT; label: string }[] = [
  { key: "eng", label: "Engineering" },
  { key: "ops", label: "Operations" },
  { key: "finance", label: "Finance" },
  { key: "analytics", label: "Analytics" },
];

/**
 * The form starts blank. Every figure is something the reader supplies, so a
 * filled-in result can't be mistaken for one the tool assumed.
 */
export const EMPTY_INPUTS: NavigatorInputs = {
  hq_country: "US",
  company_size: 0,
  global2000: false,
  seats_y1: 0,
  seats_y3: 0,
  functions: [],
  priority: "cost",
  open_to_tier2: false,
  investment_inr_cr: null,
};

export const COMPONENT_LABELS: Record<string, string> = {
  talent: "Talent depth",
  rent: "Rent",
  salary: "Salary",
  attrition: "Attrition",
  incentives: "Incentives",
};

/** Component segment colours, ink→light slate (sand is reserved for accents). */
export const COMPONENT_COLOURS: Record<string, string> = {
  talent: "#304359",
  rent: "#415977",
  salary: "#778DA9",
  attrition: "#A9B6C4",
  incentives: "#D7DDE4",
};

export function validate(inputs: NavigatorInputs): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  // An empty field is asked for; a filled one is range-checked. "Between 10 and
  // 1,000,000" against a blank box reads as a rule rather than a request.
  if (!Number.isFinite(inputs.company_size) || inputs.company_size <= 0)
    errors.company_size = "Enter your company size.";
  else if (inputs.company_size < 10 || inputs.company_size > 1_000_000)
    errors.company_size = "Between 10 and 1,000,000 employees.";
  if (!Number.isFinite(inputs.seats_y1) || inputs.seats_y1 <= 0)
    errors.seats_y1 = "Enter seats for year 1.";
  else if (inputs.seats_y1 > 2_000) errors.seats_y1 = "Between 1 and 2,000 seats.";
  if (!Number.isFinite(inputs.seats_y3) || inputs.seats_y3 <= 0)
    errors.seats_y3 = "Enter seats for year 3.";
  else if (inputs.seats_y3 < inputs.seats_y1)
    errors.seats_y3 = "Year 3 seats can't be below year 1 seats.";
  if (inputs.functions.length === 0) errors.functions = "Pick at least one function.";
  if (inputs.investment_inr_cr !== null && inputs.investment_inr_cr < 0)
    errors.investment_inr_cr = "Can't be negative.";
  return errors;
}

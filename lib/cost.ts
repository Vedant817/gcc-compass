import { cityRaw } from "./scoring";
import { RENT_SOURCE_ID, type RegistryView } from "./registry";
import type { NavigatorInputs } from "./types";

export const SQFT_PER_SEAT = 150; // A1

export const COST_ASSUMPTIONS: { id: string; text: string }[] = [
  { id: "A1", text: "150 sq ft per seat (planning assumption, not sourced)." },
  { id: "A2", text: "Linear ramp; year 2 is the midpoint of year 1 and year 3 seats." },
  { id: "A3", text: "Rent flat over 3 years (Bengaluru saw +9% YoY in 2025; not applied)." },
  { id: "A4", text: "Every seat costs the mid-level SWE CTC for that city (proxy; applies to ops seats too, so ops cost is overstated). Source: HRBx 2026, low confidence." },
  { id: "A5", text: "Salaries rise 9.9%/yr (Talent500 2025 average increment)." },
];

export const COST_EXCLUDES =
  "Excludes incentives (shown separately, never netted), fit-out, capex, setup fees, Flexiple fees, FX and taxes.";

export interface CostRow {
  year: number;
  seats: number;
  rent_lakh: number | null;
  salary_lakh: number | null;
  total_lakh: number | null;
}

export interface CostEstimate {
  rows: CostRow[];
  total_lakh: number | null;
  salary_missing: boolean;
  rent_missing: boolean;
  ctc: number | null;
  rent: number | null;
  rent_as_of: string | null;
  increment_pct: number | null;
}

/**
 * Three-year cost estimate (04 §6). Pure arithmetic on registry facts; no
 * smoothing, no rounding into new figures beyond the 1-decimal display value.
 */
export function threeYear(reg: RegistryView, cityId: string, inputs: NavigatorInputs): CostEstimate {
  const rentFact = reg.numericFact(cityId, "office_rent_grade_a", RENT_SOURCE_ID);
  const rent = rentFact?.value_num ?? null;
  const { raw } = cityRaw(reg, cityId, inputs);
  const ctc = raw.salary;
  const incPct = reg.numericFact("IN", "salary_increment_pct")?.value_num ?? null;
  const inc = (incPct ?? 0) / 100;
  const seats = [inputs.seats_y1, (inputs.seats_y1 + inputs.seats_y3) / 2, inputs.seats_y3];

  const rows: CostRow[] = seats.map((s, i) => {
    const rentLakh = rent !== null ? (s * SQFT_PER_SEAT * rent * 12) / 1e5 : null;
    const salaryLakh = ctc !== null ? s * ctc * Math.pow(1 + inc, i) : null;
    return {
      year: i + 1,
      seats: s,
      rent_lakh: rentLakh === null ? null : round1(rentLakh),
      salary_lakh: salaryLakh === null ? null : round1(salaryLakh),
      total_lakh:
        rentLakh !== null && salaryLakh !== null ? round1(rentLakh + salaryLakh) : null,
    };
  });

  const totals = rows.map((r) => r.total_lakh);
  const total_lakh = totals.every((t) => t !== null)
    ? round1(totals.reduce((s, t) => s + (t as number), 0))
    : null;

  return {
    rows,
    total_lakh,
    salary_missing: ctc === null,
    rent_missing: rent === null,
    ctc,
    rent,
    rent_as_of: rentFact?.as_of ?? null,
    increment_pct: incPct,
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}


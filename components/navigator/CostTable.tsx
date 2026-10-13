"use client";

import { useMemo, useState } from "react";
import type { RegistryView } from "@/lib/registry";
import { threeYear, COST_ASSUMPTIONS, COST_EXCLUDES } from "@/lib/cost";
import type { NavigatorInputs } from "@/lib/types";
import type { RankedCity } from "@/lib/scoring";
import { Card, Table, Td, Th, Tr } from "@/components/ui/table";
import { inrNum, lakhCr } from "@/lib/format";
import { SQFT_PER_SEAT } from "@/lib/cost";

export function CostTable({
  reg,
  inputs,
  cities,
  allOpen = false,
}: {
  reg: RegistryView;
  inputs: NavigatorInputs;
  cities: RankedCity[];
  allOpen?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(cities[0]?.city ?? null);

  return (
    <Card
      title="3-year cost estimate"
      aside={<span className="text-xs text-status-needscheck border border-status-needscheck bg-status-needscheckbg px-1.5 py-0.5 rounded">Estimate</span>}
    >
      {cities.length === 0 ? (
        <p className="text-sm text-muted">No ranked cities, so no cost estimate.</p>
      ) : (
        <>
          {!allOpen && (
            <div className="flex flex-wrap gap-2 mb-3">
              {cities.map((c) => (
                <button
                  key={c.city}
                  className={`px-2.5 py-1 text-sm border rounded ${
                    open === c.city ? "border-ink bg-ink text-white" : "border-rule bg-white text-ink hover:border-slate-light"
                  }`}
                  onClick={() => setOpen(c.city)}
                >
                  {reg.cityName(c.city)}
                </button>
              ))}
            </div>
          )}
          {cities.map((c) => (
            <CityCost key={c.city} reg={reg} inputs={inputs} cityId={c.city} open={allOpen || open === c.city} />
          ))}
        </>
      )}
      <FormulaNote reg={reg} inputs={inputs} cities={cities} />
    </Card>
  );
}

/** The formula with the live constants: sq ft from A1, escalator from the registry. */
function FormulaNote({
  reg,
  inputs,
  cities,
}: {
  reg: RegistryView;
  inputs: NavigatorInputs;
  cities: RankedCity[];
}) {
  const est = useMemo(
    () => (cities.length > 0 ? threeYear(reg, cities[0].city, inputs) : null),
    [reg, cities, inputs],
  );
  const inc = est?.increment_pct ?? null;
  return (
    <div className="mt-3 border-t border-rule pt-3 text-sm">
      <h4 className="text-[13px] font-medium text-slate mb-1">Formula and assumptions</h4>
      <p className="font-mono text-[12px] bg-paper border border-rule rounded px-2 py-1 mb-2">
        Rent × seats = seats × {SQFT_PER_SEAT} sq ft × rent ₹/sq ft/month × 12 months
        {" · "}
        Salary × seats = seats × CTC ×
        {inc === null ? "(1 + annual increase)^" : `(1 + ${(inc / 100).toFixed(3)})^`}(years−1)
      </p>
      <ul className="space-y-0.5 text-[13px]">
        {COST_ASSUMPTIONS.map((a) => (
          <li key={a.id}>
            <span className="font-medium">{a.id}</span> {a.text}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted mt-2">{COST_EXCLUDES}</p>
    </div>
  );
}

function CityCost({
  reg,
  inputs,
  cityId,
  open,
}: {
  reg: RegistryView;
  inputs: NavigatorInputs;
  cityId: string;
  open: boolean;
}) {
  const est = useMemo(() => threeYear(reg, cityId, inputs), [reg, cityId, inputs]);
  if (!open) return null;
  return (
    <div className="mb-4">
      <Table>
        <thead>
          <tr>
            <Th>Year</Th>
            <Th numeric>Seats</Th>
            <Th numeric>Rent (₹ lakh)</Th>
            <Th numeric>Salaries (₹ lakh)</Th>
            <Th numeric>Total (₹ lakh)</Th>
          </tr>
        </thead>
        <tbody>
          {est.rows.map((r) => (
            <Tr key={r.year}>
              <Td>{r.year}</Td>
              <Td numeric>{inrNum(r.seats)}</Td>
              <Td numeric>{r.rent_lakh === null ? "—" : inrNum(r.rent_lakh, 1)}</Td>
              <Td numeric>{r.salary_lakh === null ? "—" : inrNum(r.salary_lakh, 1)}</Td>
              <Td numeric>{r.total_lakh === null ? "—" : inrNum(r.total_lakh, 1)}</Td>
            </Tr>
          ))}
          {est.total_lakh !== null ? (
            <Tr className="font-medium">
              <Td colSpan={4}>3-year total</Td>
              <Td numeric>{lakhCr(est.total_lakh)}</Td>
            </Tr>
          ) : (
            <Tr>
              <Td colSpan={5} className="text-muted">
                Salary data missing; rent only — no total is computed.
              </Td>
            </Tr>
          )}
        </tbody>
      </Table>
      <p className="text-xs text-muted mt-1">
        {est.rent_missing
          ? "No Grade A rent figure in the registry for this city."
          : `Rent: ₹${inrNum(est.rent as number)}/sq ft/month (Grade A${est.rent_as_of ? `, ${est.rent_as_of}` : ""}).`}{" "}
        {est.ctc !== null
          ? `CTC: ₹${est.ctc.toFixed(1)} lakh mid-level SWE. Salary increment ${est.increment_pct}%/yr.`
          : "CTC: not in the registry."}
      </p>
    </div>
  );
}

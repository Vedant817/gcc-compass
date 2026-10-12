"use client";

import { useMemo } from "react";
import { RegistryView } from "@/lib/registry";
import { readOverlay } from "@/lib/overlay";
import { rank, PRESET_WEIGHTS, normaliseWeights, type RankedCity } from "@/lib/scoring";
import type { NavigatorInputs, Weights } from "@/lib/types";
import { Card, Disclosure, Table, Td, Th, Tr } from "@/components/ui/table";
import { StatusPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { inrNum, score as fmtScore } from "@/lib/format";
import { COMPONENT_COLOURS, COMPONENT_LABELS } from "./shared";
import { COMPONENTS } from "@/lib/scoring";
import { EligibilityCards } from "./EligibilityCards";
import { CostTable } from "./CostTable";
import { ProviderList } from "./ProviderList";

const PRESET_LABELS: Record<string, string> = {
  cost: "Lowest cost",
  talent: "Talent depth",
  incentives: "Incentives",
  balanced: "Balanced",
};

const MISSING_LABELS: Record<string, string> = {
  talent: "talent share",
  rent: "rent",
  salary: "CTC",
  attrition: "attrition",
};

export function NavigatorResults({
  inputs,
  weights,
  onWeightsChange,
  onPreset,
  onSave,
}: {
  inputs: NavigatorInputs;
  weights: Weights;
  onWeightsChange: (w: Weights) => void;
  onPreset: (p: NavigatorInputs["priority"]) => void;
  onSave: () => void;
}) {
  const reg = useMemo(() => RegistryView.load(readOverlay()), []);
  const ranked = useMemo(() => rank(reg, inputs, weights), [reg, inputs, weights]);
  const rankedCities = ranked.filter((r) => r.score !== null);
  const unranked = ranked.filter((r) => r.score === null);
  const top3 = rankedCities.slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <Card
        title="City ranking"
        aside={
          <span className="text-xs text-muted">
            {rankedCities.length} ranked · {unranked.length} without enough data
          </span>
        }
      >
        {rankedCities.length === 0 ? (
          <p className="text-sm text-muted">
            No city has enough registry data to rank on these weights. Add a source, or widen the
            weights.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Rank</Th>
                <Th>City</Th>
                <Th numeric>Score (0-100)</Th>
                <Th>Score parts</Th>
                <Th numeric>Talent share</Th>
                <Th numeric>Rent ₹/sq ft</Th>
                <Th numeric>Est. CTC ₹L</Th>
                <Th numeric>Attrition</Th>
                <Th>Incentives</Th>
              </tr>
            </thead>
            <tbody>
              {rankedCities.map((r, i) => (
                <RankRow key={r.city} reg={reg} r={r} rankNo={i + 1} weights={weights} />
              ))}
            </tbody>
          </Table>
        )}
        <p className="text-xs text-muted mt-2">
          Score parts: a bar per city, split by component contribution (weight × normalised value).
          Missing components are not counted and not imputed.
        </p>
        {unranked.length > 0 && (
          <div className="mt-3 border-t border-rule pt-3">
            <h4 className="text-[13px] font-medium text-slate mb-1">Not enough data to rank</h4>
            <ul className="text-sm text-muted space-y-1">
              {unranked.map((r) => (
                <li key={r.city} className="flex gap-2">
                  <span className="text-muted select-none" aria-hidden="true">
                    —
                  </span>
                  <span>
                    <span className="text-ink">{reg.cityName(r.city)}</span>:{" "}
                    {missingText(reg, r)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <WeightSliders
        weights={weights}
        onChange={onWeightsChange}
        onPreset={onPreset}
        activePriority={inputs.priority}
      />

      <Disclosure summary="How this score works">
        <div className="text-sm space-y-2">
          <p>
            Each component is min-max normalised across the candidate cities that have the value
            (missing stays missing, never zero). The score is:
          </p>
          <p className="font-mono text-[13px] bg-paper border border-rule rounded px-2 py-1">
            score = 100 × Σ(w<sub>k</sub> × x<sub>k</sub>) ÷ Σ w<sub>k</sub>{" "}
            <span className="text-muted">over components with data</span>
          </p>
          <p>
            A city is ranked only when the components it has cover at least 60% of the weight;
            otherwise it is listed under “Not enough data to rank”. Weights are our default, not
            data — change them with the sliders.
          </p>
          <p className="text-muted">
            Current weights:{" "}
            {COMPONENTS.map(
              (k) =>
                `${COMPONENT_LABELS[k]} ${Math.round(normaliseWeights(weights)[k] * 100)}%`,
            ).join(" · ")}
          </p>
        </div>
      </Disclosure>

      <EligibilityCards reg={reg} inputs={inputs} ranked={ranked} />

      <CostTable reg={reg} inputs={inputs} cities={top3} />

      <ProviderList reg={reg} inputs={inputs} />

      <div className="flex items-center gap-3">
        <Button onClick={onSave}>Save &amp; export plan</Button>
        <span className="text-xs text-muted">
          Creates a shareable link with the inputs, weights and every citation.
        </span>
      </div>
    </div>
  );
}

function RankRow({
  reg,
  r,
  rankNo,
  weights,
}: {
  reg: RegistryView;
  r: RankedCity;
  rankNo: number;
  weights: Weights;
}) {
  const w = normaliseWeights(weights);
  const status = incentiveStatus(reg, r);
  return (
    <Tr>
      <Td className="text-muted">{rankNo}</Td>
      <Td className="font-medium">{reg.cityName(r.city)}</Td>
      <Td numeric className="font-medium">
        {fmtScore(r.score)}
      </Td>
      <Td>
        <span className="flex h-3 w-40 overflow-hidden border border-rule" title={scoreTitle(r, w)}>
        {COMPONENTS.map((k) => {
          const x = r.components[k];
          if (x === null) return null;
          const pct = w[k] * x;
          if (pct <= 0) return null;
          return (
            <span
              key={k}
              style={{
                width: `${pct * 100}%`,
                background: COMPONENT_COLOURS[k],
              }}
            />
          );
        })}
        </span>
      </Td>
      <Td numeric>{r.raw.talent === null ? "—" : `${r.raw.talent}%`}</Td>
      <Td numeric>{r.raw.rent === null ? "—" : inrNum(r.raw.rent)}</Td>
      <Td numeric>{r.raw.salary === null ? "—" : r.raw.salary.toFixed(1)}</Td>
      <Td numeric>{r.raw.attrition === null ? "—" : `${r.raw.attrition}%`}</Td>
      <Td>
        {status.status ? (
          <StatusPill status={status.status} />
        ) : (
          <span className="text-muted text-xs">{status.label}</span>
        )}
      </Td>
    </Tr>
  );
}

function scoreTitle(r: RankedCity, w: Weights): string {
  return COMPONENTS.filter((k) => r.components[k] !== null)
    .map(
      (k) =>
        `${COMPONENT_LABELS[k]}: weight ${Math.round(w[k] * 100)}% × value ${(
          r.components[k] as number
        ).toFixed(3)} = ${(w[k] * (r.components[k] as number)).toFixed(3)}`,
    )
    .join("\n");
}

function missingText(reg: RegistryView, r: RankedCity): string {
  const missing = COMPONENTS.filter((k) => r.components[k] === null);
  if (missing.length === 0) return "coverage below 60% of the weight on these settings.";
  return `no ${missing.map((k) => MISSING_LABELS[k]).join(" or ")} figure in the registry.`;
}

export function incentiveStatus(
  reg: RegistryView,
  r: RankedCity,
): { status?: "eligible" | "needs_check" | "not_eligible"; label?: string } {
  const state = reg.stateForCity(r.city);
  if (r.eligibility.length === 0) {
    if (state?.gcc_policy_status === "none_known") {
      const asOf = reg.factsFor(state.id, "gcc_policy_status")[0]?.as_of;
      return { label: asOf ? `No GCC fiscal policy on record (${asOf})` : "No GCC fiscal policy on record" };
    }
    if (state?.gcc_policy_status === "expected")
      return { label: "Policy expected [UNVERIFIED]" };
    return { label: "No policy on record" };
  }
  if (r.eligibility.some((e) => e.status === "eligible")) return { status: "eligible" };
  if (r.eligibility.some((e) => e.status === "needs_check")) return { status: "needs_check" };
  return { status: "not_eligible" };
}

function WeightSliders({
  weights,
  onChange,
  onPreset,
  activePriority,
}: {
  weights: Weights;
  onChange: (w: Weights) => void;
  onPreset: (p: NavigatorInputs["priority"]) => void;
  activePriority: NavigatorInputs["priority"];
}) {
  const norm = normaliseWeights(weights);
  return (
    <Card title="Weights" aside={<span className="text-xs text-muted">0-100, normalised to 100%</span>}>
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.keys(PRESET_LABELS).map((p) => (
          <button
            key={p}
            className={`h-8 px-2.5 text-sm border rounded ${
              activePriority === p
                ? "border-ink bg-ink text-white"
                : "border-rule bg-white text-ink hover:border-slate-light"
            }`}
            onClick={() => onPreset(p as NavigatorInputs["priority"])}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-1">
        {COMPONENTS.map((k) => (
          <div key={k} className="flex items-center gap-3 h-9">
            <span className="w-28 shrink-0 text-[13px] text-slate whitespace-nowrap">
              {COMPONENT_LABELS[k]}
            </span>
            <Slider
              id={`w-${k}`}
              value={weights[k]}
              onChange={(v) => onChange({ ...weights, [k]: v })}
              ariaLabel={COMPONENT_LABELS[k]}
            />
            <span className="w-12 text-right text-sm tabular-nums">
              {Math.round(norm[k] * 100)}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}




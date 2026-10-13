"use client";

import { useMemo } from "react";
import type { RegistryView } from "@/lib/registry";
import { evaluatePolicy } from "@/lib/eligibility";
import type { NavigatorInputs, Policy } from "@/lib/types";
import type { RankedCity } from "@/lib/scoring";
import { Card } from "@/components/ui/table";
import { StatusPill, UnverifiedBadge, ConfidenceBadge, SiteLinkFlag, AiExtractedBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CitationChip } from "@/components/CitationChip";
import { factValue } from "@/lib/format";

const INCENTIVE_TYPE_LABELS: Record<string, string> = {
  capex: "Capex",
  rental: "Rental",
  payroll: "Payroll",
  opex: "OPEX",
  interest: "Interest",
  other: "Other",
};

export function EligibilityCards({
  reg,
  inputs,
  ranked,
}: {
  reg: RegistryView;
  inputs: NavigatorInputs;
  ranked: RankedCity[];
}) {
  const cards = useMemo(() => {
    const rankOrder = new Map(ranked.map((r, i) => [r.city, i]));
    const candidateStates = reg.cities
      .filter((c) => c.tier === 1 || inputs.open_to_tier2)
      .map((c) => ({ state: c.state_id, city: c.id }));

    const byState = new Map<string, { bestCity: string; order: number }>();
    for (const { state, city } of candidateStates) {
      const order = rankOrder.get(city) ?? 1000 + city.length; // unranked after ranked
      const cur = byState.get(state);
      if (!cur || order < cur.order) byState.set(state, { bestCity: city, order });
    }

    return [...byState.entries()]
      .sort((a, b) => a[1].order - b[1].order)
      .map(([stateId, { bestCity }]) => {
        const state = reg.state(stateId);
        const policies = reg.policiesForState(stateId);
        const evaluated = policies.map((p) => ({
          policy: p,
          result: evaluatePolicy(p, { ...inputs, city_id: bestCity }),
        }));
        return { stateId, state, evaluated, cityId: bestCity };
      });
  }, [reg, inputs, ranked]);

  return (
    <Card
      title="Incentive eligibility"
      aside={<span className="text-xs text-muted">Rules evaluated against your inputs; nothing is assumed</span>}
    >
      <div className="grid md:grid-cols-2 gap-4 items-stretch">
        {cards.map(({ stateId, state, evaluated, cityId }) => (
          <article
            key={stateId}
            className="border border-rule rounded bg-white p-3 flex flex-col"
          >
            <header className="flex items-baseline justify-between gap-2 mb-2">
              <h4 className="text-[15px] font-medium">
                {state?.name ?? stateId}
                <span className="text-muted font-normal text-[13px]"> · {reg.cityName(cityId)}</span>
              </h4>
            </header>
            {evaluated.length === 0 ? (
              <div className="text-sm">
                {state?.gcc_policy_status === "none_known" && (
                  <p className="text-status-noteligible">
                    {(() => {
                      const asOf = reg.factsFor(stateId, "gcc_policy_status")[0]?.as_of;
                      return asOf
                        ? `No GCC fiscal policy on record (${asOf}).`
                        : "No GCC fiscal policy on record.";
                    })()}{" "}
                    {state.note ?? ""}
                  </p>
                )}
                {state?.gcc_policy_status === "expected" && (
                  <p className="flex flex-wrap items-center gap-2 text-status-needscheck">
                    Policy expected. {state.note ?? ""}
                    {state.unverified && <UnverifiedBadge />}
                  </p>
                )}
                {state?.gcc_policy_status === "active" && (
                  <p className="text-muted">No policy details in the registry yet.</p>
                )}
                {(() => {
                  const statusFacts = reg.factsFor(stateId, "gcc_policy_status");
                  if (statusFacts.length === 0) return null;
                  return (
                    <ul className="mt-2 space-y-1">
                      {statusFacts.map((f) => {
                        const src = reg.source(f.source_id);
                        return (
                          <li key={f.id} className="text-[13px] flex flex-wrap items-center gap-2">
                            <CitationChip id={f.id} />
                            <span>{f.value_text ?? factValue(f)}</span>
                            <span className="text-muted">(as of {f.as_of})</span>
                            {src && (
                              <LinkButton href={src.url} variant="ghost" className="px-0 py-0 text-xs">
                                {src.publisher}
                              </LinkButton>
                            )}
                            {src?.url_precision === "domain_only" && <SiteLinkFlag />}
                            {f.extracted_by === "ai" && <AiExtractedBadge />}
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
                <p className="text-xs text-muted mt-2">
                  Counts as 0 for the incentives component.
                </p>
              </div>
            ) : (
              evaluated.map(({ policy, result }) => (
                <PolicyCard key={policy.id} reg={reg} policy={policy} status={result.status} reasons={result.reasons} />
              ))
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}

function PolicyCard({
  reg,
  policy,
  status,
  reasons,
}: {
  reg: RegistryView;
  policy: Policy;
  status: "eligible" | "needs_check" | "not_eligible";
  reasons: string[];
}) {
  const src = reg.source(policy.source_id);
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-medium">{policy.name}</span>
        <StatusPill status={status} />
        {policy.unverified_parts.map((p) => (
          <UnverifiedBadge key={p} />
        ))}
      </div>
      {policy.summary && <p className="text-muted mb-2">{policy.summary}</p>}
      <ul className="mb-2 space-y-1">
        {reasons.map((r, i) => (
          <li key={i} className="text-[13px]">
            {i === 0 && status !== "eligible" ? (
              <>
                <span className={status === "not_eligible" ? "text-status-noteligible" : "text-status-needscheck"}>
                  {status === "not_eligible" ? "Not eligible: " : "Needs check: "}
                </span>
                {r}
              </>
            ) : (
              <span className="text-muted">{r}</span>
            )}
          </li>
        ))}
      </ul>
      <table className="w-full text-[13px] mb-2">
        <thead>
          <tr>
            <th className="text-left font-medium text-muted border-b border-rule px-1 py-1">Incentive</th>
            <th className="text-left font-medium text-muted border-b border-rule px-1 py-1">Terms</th>
          </tr>
        </thead>
        <tbody>
          {policy.incentives_json.map((inc, i) => (
            <tr key={i}>
              <td className="border-b border-rule px-1 py-1 align-top whitespace-nowrap">
                {INCENTIVE_TYPE_LABELS[inc.type]}
                {inc.pct !== null && ` · ${inc.pct}%`}
                {inc.duration_yrs !== null && ` · ${inc.duration_yrs} yr`}
              </td>
              <td className="border-b border-rule px-1 py-1 align-top">
                {inc.pct !== null && `${inc.pct}%`}
                {inc.cap_inr_cr !== null &&
                  `${inc.pct !== null ? ", " : ""}cap ₹${inc.cap_inr_cr} Cr`}
                {inc.conditions ? ` — ${inc.conditions}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {policy.unverified_parts.length > 0 && (
        <p className="text-xs text-muted mb-1">
          Not yet confirmed by the policy text:{" "}
          {policy.unverified_parts.join("; ").toLowerCase()}.
        </p>
      )}
      {src && (
        <p className="text-xs text-muted flex flex-wrap items-center gap-2">
          <span>Source:</span>
          <LinkButton href={src.url} variant="ghost" className="px-0 py-0">
            {src.publisher}
          </LinkButton>
          <ConfidenceBadge level={src.reliability} />
          {src.url_precision === "domain_only" && <SiteLinkFlag />}
        </p>
      )}
    </div>
  );
}

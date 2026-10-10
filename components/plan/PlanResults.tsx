"use client";

import { useMemo } from "react";
import { RegistryView } from "@/lib/registry";
import { readOverlay } from "@/lib/overlay";
import { rank } from "@/lib/scoring";
import type { NavigatorInputs, Weights } from "@/lib/types";
import { EligibilityCards } from "@/components/navigator/EligibilityCards";
import { CostTable } from "@/components/navigator/CostTable";
import { ProviderList } from "@/components/navigator/ProviderList";

/**
 * The plan page is a server component, but these three sections need a
 * RegistryView, which can't cross the server/client boundary. They rebuild the
 * same registry in the browser; the plan's inputs and weights are the only
 * inputs, so the recomputed sections match what the shortlist showed.
 */
export function PlanResults({
  inputs,
  weights,
}: {
  inputs: NavigatorInputs;
  weights: Weights;
}) {
  const reg = useMemo(() => RegistryView.load(readOverlay()), []);
  const ranked = useMemo(() => rank(reg, inputs, weights), [reg, inputs, weights]);
  const top3 = ranked.filter((r) => r.score !== null).slice(0, 3);
  return (
    <>
      <EligibilityCards reg={reg} inputs={inputs} ranked={ranked} />
      <CostTable reg={reg} inputs={inputs} cities={top3} allOpen />
      <ProviderList reg={reg} inputs={inputs} />
    </>
  );
}

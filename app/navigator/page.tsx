"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NavigatorForm, type FormErrors } from "@/components/navigator/NavigatorForm";
import { NavigatorResults } from "@/components/navigator/NavigatorResults";
import { EMPTY_INPUTS, validate } from "@/components/navigator/shared";
import { PRESET_WEIGHTS } from "@/lib/scoring";
import { encodePlan } from "@/lib/plan";
import { writeStoredPlan } from "@/lib/overlay";
import { Card, EmptyState } from "@/components/ui/table";
import type { NavigatorInputs, Weights } from "@/lib/types";

export default function NavigatorView() {
  const router = useRouter();
  const [inputs, setInputs] = useState<NavigatorInputs>(EMPTY_INPUTS);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState<NavigatorInputs | null>(null);
  const [weights, setWeights] = useState<Weights>(PRESET_WEIGHTS.cost);

  const patch = (p: Partial<NavigatorInputs>) => {
    setInputs((prev) => {
      const next = { ...prev, ...p };
      if (p.priority && PRESET_WEIGHTS[p.priority]) setWeights(PRESET_WEIGHTS[p.priority]);
      return next;
    });
    setErrors({});
  };

  const submit = () => {
    const e = validate(inputs);
    setErrors(e);
    const hasError = Object.values(e).some(Boolean);
    if (!hasError) setSubmitted(inputs);
  };

  const onPreset = (p: NavigatorInputs["priority"]) => {
    patch({ priority: p });
    setWeights(PRESET_WEIGHTS[p]);
    // the shortlist on screen is the submitted snapshot, so its priority moves too
    setSubmitted((prev) => (prev ? { ...prev, priority: p } : prev));
  };

  const save = () => {
    if (!submitted) return;
    const id = encodePlan({
      inputs: submitted,
      weights,
      priority: submitted.priority,
      created_at: new Date().toISOString(),
    });
    writeStoredPlan({ inputs: submitted, weights, priority: submitted.priority, saved_at: new Date().toISOString() });
    router.push(`/plan/${id}`);
  };

  return (
    <>
      <h1>Setup Navigator</h1>
      <p className="text-sm text-muted mb-5 max-w-2xl">
        Enter your company profile and get a ranked shortlist, the incentives you qualify for, a
        3-year cost estimate, and who to call — with the score broken down so you can defend it.
      </p>
      <div className="grid lg:grid-cols-[360px_1fr] gap-6 items-start">
      <div className="lg:sticky lg:top-6 flex flex-col gap-3">
        <NavigatorForm value={inputs} errors={errors} onChange={patch} onSubmit={submit} />
      </div>

      <div className="flex flex-col gap-4">
        {submitted ? (
          <NavigatorResults
            inputs={submitted}
            weights={weights}
            onWeightsChange={setWeights}
            onPreset={onPreset}
            onSave={save}
          />
        ) : (
          <>
            <Card title="What this gives you">
              <ol className="text-sm space-y-1 list-decimal ml-4">
                <li>A ranked shortlist with the score broken into components you can argue with.</li>
                <li>Which state incentives you qualify for — and why not, when you don't.</li>
                <li>A 3-year cost estimate with its assumptions on screen.</li>
                <li>Who to call, Flexiple tagged honestly alongside the alternatives.</li>
              </ol>
            </Card>
            <EmptyState>
              Fill the form and press “Build my shortlist”. Everything is computed from the
              registry in your browser; nothing is sent anywhere until you ask a question.
            </EmptyState>
          </>
        )}
      </div>
      </div>
    </>
  );
}

"use client";

import { Field, RadioGroup, Select, TextInput } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import type { NavigatorInputs } from "@/lib/types";
import { FUNCTIONS } from "./shared";

const HQ_OPTIONS = ["US", "UK", "Germany", "France", "Netherlands", "Other EU", "Other"];

export interface FormErrors {
  [field: string]: string | null;
}

export function NavigatorForm({
  value,
  errors,
  onChange,
  onSubmit,
}: {
  value: NavigatorInputs;
  errors: FormErrors;
  onChange: (patch: Partial<NavigatorInputs>) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <section className="border border-rule rounded bg-white p-4 flex flex-col gap-4">
        <h2 className="text-[18px]">Company</h2>
        <Field label="HQ country" htmlFor="hq">
          <Select
            id="hq"
            value={value.hq_country}
            onChange={(e) => onChange({ hq_country: e.target.value as NavigatorInputs["hq_country"] })}
          >
            {HQ_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Company size (employees)"
          htmlFor="size"
          error={errors.company_size}
          hint="10 to 1,000,000"
        >
          <TextInput
            id="size"
            type="number"
            min={10}
            max={1_000_000}
            value={String(value.company_size)}
            onChange={(e) => onChange({ company_size: Number(e.target.value) })}
          />
        </Field>
        <RadioGroup
          legend="Forbes/Fortune Global 2000?"
          name="global2000"
          value={value.global2000 ? "yes" : "no"}
          onChange={(v) => onChange({ global2000: v === "yes" })}
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes" },
          ]}
        />
      </section>

      <section className="border border-rule rounded bg-white p-4 flex flex-col gap-4">
        <h2 className="text-[18px]">India centre</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Seats in year 1" htmlFor="seats1" error={errors.seats_y1}>
            <TextInput
              id="seats1"
              type="number"
              min={1}
              max={2_000}
              value={String(value.seats_y1)}
              onChange={(e) => onChange({ seats_y1: Number(e.target.value) })}
            />
          </Field>
          <Field label="Seats in year 3" htmlFor="seats3" error={errors.seats_y3}>
            <TextInput
              id="seats3"
              type="number"
              min={1}
              value={String(value.seats_y3)}
              onChange={(e) => onChange({ seats_y3: Number(e.target.value) })}
            />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="text-[13px] font-medium text-slate mb-1">Functions</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {FUNCTIONS.map((f) => (
              <Checkbox
                key={f.key}
                label={f.label}
                checked={value.functions.includes(f.key)}
                onChange={(e) => {
                  const set = new Set(value.functions);
                  if (e.target.checked) set.add(f.key);
                  else set.delete(f.key);
                  onChange({ functions: [...set] as NavigatorInputs["functions"] });
                }}
              />
            ))}
          </div>
          {errors.functions && (
            <p className="text-xs text-status-noteligible" role="alert">
              {errors.functions}
            </p>
          )}
        </fieldset>
        <Field
          label="Planned India investment (₹ Cr)"
          htmlFor="investment"
          hint="Leave blank if unknown — it is only needed to test the UP scheme's ₹50 Cr minimum."
        >
          <TextInput
            id="investment"
            type="number"
            min={0}
            placeholder="Leave blank if unknown"
            value={value.investment_inr_cr === null ? "" : String(value.investment_inr_cr)}
            onChange={(e) =>
              onChange({
                investment_inr_cr: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </Field>
        <Checkbox
          label="Open to Tier-2 cities (Indore, Coimbatore, Lucknow, Ahmedabad/GIFT)"
          checked={value.open_to_tier2}
          onChange={(e) => onChange({ open_to_tier2: e.target.checked })}
        />
      </section>

      <section className="border border-rule rounded bg-white p-4 flex flex-col gap-4">
        <h2 className="text-[18px]">Priority</h2>
        <RadioGroup
          legend="What matters most for the shortlist?"
          name="priority"
          value={value.priority}
          onChange={(v) => onChange({ priority: v as NavigatorInputs["priority"] })}
          options={[
            { value: "cost", label: "Lowest cost" },
            { value: "talent", label: "Talent depth" },
            { value: "incentives", label: "Incentives" },
            { value: "balanced", label: "Balanced" },
          ]}
        />
        <div className="flex items-center gap-3">
          <Button type="submit">Build my shortlist</Button>
        </div>
      </section>
    </form>
  );
}

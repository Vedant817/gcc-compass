import { z } from "zod";

export const Confidence = z.enum(["H", "M", "L"]);
export type ConfidenceT = z.infer<typeof Confidence>;

export const SourceType = z.enum([
  "official_policy",
  "industry_report",
  "broker_report",
  "news",
  "vendor_blog",
  "api",
]);
export const UrlPrecision = z.enum(["exact", "domain_only"]);

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string(),
  published_date: z.string().nullable(),
  type: SourceType,
  reliability: Confidence,
  url_precision: UrlPrecision,
  notes: z.string().default(""),
});
export type Source = z.infer<typeof SourceSchema>;

export const FactSchema = z.object({
  id: z.string(),
  entity_type: z.enum(["country", "city", "state", "provider"]),
  entity_id: z.string(),
  metric: z.string(),
  value_num: z.number().nullable(),
  value_text: z.string().nullable(),
  unit: z.string().nullable(),
  as_of: z.string(),
  definition_note: z.string().nullable(),
  source_id: z.string(),
  confidence: Confidence,
  verified_by_human: z.boolean(),
  extracted_by: z.enum(["ai", "human", "api"]),
  unverified: z.boolean().default(false),
  quote: z.string().nullable().default(null),
});
export type Fact = z.infer<typeof FactSchema>;

export const CitySchema = z.object({
  id: z.string(),
  name: z.string(),
  state_id: z.string(),
  tier: z.union([z.literal(1), z.literal(2)]),
});
export type City = z.infer<typeof CitySchema>;

export const StateSchema = z.object({
  id: z.string(),
  name: z.string(),
  gcc_policy_status: z.enum(["active", "none_known", "expected"]),
  source_id: z.string(),
  note: z.string().nullable().default(null),
  unverified: z.boolean().default(false),
});
export type State = z.infer<typeof StateSchema>;

export const RuleSchema = z.object({
  field: z.enum([
    "hq_country",
    "company_size",
    "global2000",
    "seats_y1",
    "seats_y3",
    "functions",
    "open_to_tier2",
    "investment_inr_cr",
    "city_id",
  ]),
  op: z.enum(["==", "!=", ">=", "<=", "in", "not_in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  fail_reason: z.string(),
});

export const IncentiveSchema = z.object({
  type: z.enum(["capex", "rental", "payroll", "opex", "interest", "other"]),
  pct: z.number().nullable(),
  cap_inr_cr: z.number().nullable(),
  duration_yrs: z.number().nullable(),
  conditions: z.string(),
});

export const PolicySchema = z.object({
  id: z.string(),
  state_id: z.string(),
  name: z.string(),
  year: z.number().nullable(),
  summary: z.string().nullable(),
  /**
   * Optional size-class thresholds, for a policy whose caps depend on the class
   * a company falls into. Absent means the class can't be worked out from the
   * registry, which the Ask answer then states rather than guessing.
   */
  size_class_thresholds: z
    .array(
      z.object({
        class: z.string(),
        min_seats: z.number().nullable(),
        min_investment_inr_cr: z.number().nullable(),
      }),
    )
    .default([]),
  eligibility_json: z.object({
    all: z.array(RuleSchema),
    needs_check: z.array(z.string()).default([]),
  }),
  incentives_json: z.array(IncentiveSchema),
  source_id: z.string(),
  unverified_parts: z.array(z.string()).default([]),
});
export type Policy = z.infer<typeof PolicySchema>;

export const ProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["setup_bot", "eor", "recruiting", "legal_tax", "real_estate", "advisory"]),
  cities: z.array(z.string()).default([]),
  notes: z.string().nullable().default(null),
  source_id: z.string().nullable(),
  is_flexiple: z.boolean().default(false),
});
export type Provider = z.infer<typeof ProviderSchema>;

export const WeightsSchema = z.object({
  talent: z.number(),
  rent: z.number(),
  salary: z.number(),
  attrition: z.number(),
  incentives: z.number(),
});
export type Weights = z.infer<typeof WeightsSchema>;

export const FunctionKey = z.enum(["eng", "ops", "finance", "analytics"]);
export const NavigatorInputsSchema = z.object({
  hq_country: z.enum(["US", "UK", "Germany", "France", "Netherlands", "Other EU", "Other"]),
  company_size: z.number().int().min(10).max(1_000_000),
  global2000: z.boolean(),
  seats_y1: z.number().int().min(1).max(2_000),
  seats_y3: z.number().int().min(1).max(5_000),
  functions: z.array(FunctionKey).min(1),
  priority: z.enum(["cost", "talent", "incentives", "balanced"]),
  open_to_tier2: z.boolean(),
  investment_inr_cr: z.number().nonnegative().nullable(),
});
export type NavigatorInputs = z.infer<typeof NavigatorInputsSchema>;

export type PresetKey = "cost" | "talent" | "incentives" | "balanced";

export const RegistrySchema = z.object({
  sources: z.array(SourceSchema),
  facts: z.array(FactSchema),
  cities: z.array(CitySchema),
  states: z.array(StateSchema),
  policies: z.array(PolicySchema),
  providers: z.array(ProviderSchema),
});
export type Registry = z.infer<typeof RegistrySchema>;

export const AskResponse = z.object({
  answer: z.string().max(2000),
  cited_ids: z.array(z.string()),
  not_in_registry: z.boolean(),
  missing: z.string().nullable(),
});
export type AskResponseT = z.infer<typeof AskResponse>;

export const ExtractedFact = z.object({
  entity_type: z.enum(["country", "city", "state", "provider"]),
  // optional-with-null: the schema in 05 is strict about types, but some
  // OpenAI-compatible models omit null keys entirely, so a missing key is
  // coerced to null rather than failing validation.
  entity_id: z.string().nullable().optional(),
  entity_name: z.string().nullable().optional(),
  metric: z.string().regex(/^[a-z0-9_]+$/),
  new_metric: z.boolean(),
  value_num: z.number().nullable().optional(),
  value_text: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  as_of: z.string().nullable().optional(),
  definition_note: z.string().nullable().optional(),
  quote: z.string().max(300),
  suggested_confidence: Confidence,
});
export const Extracted = z.object({
  facts: z.array(ExtractedFact).max(15),
  warnings: z.array(z.string()),
});
export type ExtractedT = z.infer<typeof Extracted>;
export type ExtractedFactT = z.infer<typeof ExtractedFact>;

export type Rule = z.infer<typeof RuleSchema>;
export type FunctionKeyT = z.infer<typeof FunctionKey>;



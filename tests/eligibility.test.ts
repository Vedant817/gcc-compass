import { describe, expect, it } from "vitest";
import { evaluatePolicy, evaluateRule } from "../lib/eligibility";
import { RegistryView } from "../lib/registry";
import type { NavigatorInputs } from "../lib/types";

const reg = RegistryView.load();
const persona: NavigatorInputs = {
  hq_country: "US",
  company_size: 400,
  global2000: false,
  seats_y1: 40,
  seats_y3: 120,
  functions: ["eng", "ops"],
  priority: "cost",
  open_to_tier2: false,
  investment_inr_cr: null,
};

const tn = reg.policy("pol_tn_2024")!;
const ka = reg.policy("pol_ka_2024")!;
const up = reg.policy("pol_up_2024")!;
const mh = reg.policy("pol_mh_2025")!;

describe("rules engine", () => {
  it("missing input is needs check, never a silent pass", () => {
    const r = evaluateRule(up.eligibility_json.all[0], { ...persona, investment_inr_cr: null });
    expect(r.status).toBe("needs_check");
    expect(r.reason).toBe(
      "Need your investment_inr_cr to check: UP policy requires minimum FDI of ₹50 Cr.",
    );
  });

  it("comparison ops", () => {
    const rule = { field: "company_size" as const, op: ">=" as const, value: 100, fail_reason: "too small" };
    expect(evaluateRule(rule, { company_size: 400 }).status).toBe("eligible");
    expect(evaluateRule(rule, { company_size: 50 })).toEqual({
      status: "not_eligible",
      reason: "too small",
    });
  });
});

describe("Tamil Nadu (demo persona)", () => {
  it("is not eligible with both reasons listed", () => {
    const res = evaluatePolicy(tn, { ...persona, city_id: "chennai" });
    expect(res.status).toBe("not_eligible");
    expect(res.reasons).toEqual([
      "TN scheme requires a Forbes/Fortune Global 2000 company.",
      "TN scheme requires 200+ direct employees.",
    ]);
  });

  it("a Global 2000 with 200+ year-3 seats is eligible", () => {
    const res = evaluatePolicy(tn, {
      ...persona,
      global2000: true,
      seats_y3: 250,
      city_id: "chennai",
    });
    expect(res.status).toBe("eligible");
  });
});

describe("Karnataka (city-scoped rule)", () => {
  it("not eligible inside Bengaluru", () => {
    const res = evaluatePolicy(ka, { ...persona, city_id: "bengaluru" });
    expect(res.status).toBe("not_eligible");
    expect(res.reasons).toEqual(["Karnataka pays these incentives only outside Bengaluru."]);
  });

  it("eligible for a Karnataka city outside Bengaluru (test-only id)", () => {
    const res = evaluatePolicy(ka, { ...persona, city_id: "mysuru" });
    expect(res.status).toBe("eligible");
    expect(res.reasons).toEqual(["All registry rules pass."]);
  });
});

describe("Uttar Pradesh (investment threshold)", () => {
  it("needs check when investment is blank", () => {
    expect(evaluatePolicy(up, { ...persona, investment_inr_cr: null }).status).toBe("needs_check");
  });
  it("eligible at ₹60 Cr", () => {
    expect(evaluatePolicy(up, { ...persona, investment_inr_cr: 60 }).status).toBe("eligible");
  });
  it("not eligible at ₹10 Cr", () => {
    expect(evaluatePolicy(up, { ...persona, investment_inr_cr: 10 }).status).toBe("not_eligible");
  });
});

describe("Maharashtra (thresholds not in the registry)", () => {
  it("is always needs check with the size-class reason", () => {
    const res = evaluatePolicy(mh, { ...persona, city_id: "pune" });
    expect(res.status).toBe("needs_check");
    expect(res.reasons).toEqual([
      "Size class (Small to Mega) thresholds and Zone I/II mapping of your site are not in the registry.",
    ]);
  });
});


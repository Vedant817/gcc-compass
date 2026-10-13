import { describe, expect, it } from "vitest";
import {
  classifySizeClass,
  planContextForAsk,
  readSizeClassBands,
  sizeClassForPlan,
  type SizeClassBand,
} from "../lib/planContext";
import { seedRegistry } from "../lib/registry";
import { DEMO_PERSONA } from "../components/navigator/shared";

const BANDS: SizeClassBand[] = [
  { class: "Mega", min_seats: 500, min_investment_inr_cr: 300 },
  { class: "Large", min_seats: 200, min_investment_inr_cr: 100 },
  { class: "Medium", min_seats: 75, min_investment_inr_cr: 30 },
  { class: "Small", min_seats: 20, min_investment_inr_cr: 10 },
];

function bands(rows: SizeClassBand[]): SizeClassBand[] {
  // readSizeClassBands sorts; feed in an order that would prove the sort runs
  return [...rows].reverse();
}

describe("size class", () => {
  it("reports the gap for the real seed, which carries no thresholds", () => {
    const policy = seedRegistry.policies.find((p) => p.id === "pol_mh_2025");
    expect(policy).toBeDefined();
    expect(readSizeClassBands(policy!)).toEqual([]);

    const answer = sizeClassForPlan(seedRegistry.policies, DEMO_PERSONA);
    expect(answer?.policyId).toBe("pol_mh_2025");
    expect(answer?.className).toBeNull();
    expect(answer?.gap).toBeTruthy();
    // the gap quotes the policy's own needs-check line, not a guess
    expect(answer?.gap).toMatch(/size class/i);
  });

  it("puts the registry's own wording in front of the model", () => {
    const ctx = planContextForAsk(seedRegistry.policies, DEMO_PERSONA);
    expect(ctx).toContain("not determinable");
    expect(ctx).toContain("pol_mh_2025");
    // it must not offer a cap to fall back on
    expect(ctx).not.toMatch(/₹100 Cr/);
  });

  it("orders bands highest-first", () => {
    expect(readSizeClassBands({
      ...seedRegistry.policies[0],
      size_class_thresholds: bands(BANDS),
    }).map((b) => b.class)).toEqual(["Mega", "Large", "Medium", "Small"]);
  });

  it("classifies on seats and investment, taking the highest band met", () => {
    const plan = { ...DEMO_PERSONA, seats_y3: 120, investment_inr_cr: 40 };
    // 120 seats clears Medium (75) and Medium's 30 Cr, but not Large's 200 seats
    expect(classifySizeClass(BANDS, plan)).toBe("Medium");
  });

  it("needs both sides of a band when both are named", () => {
    // 600 seats reaches Mega's seat count but not its ₹300 Cr investment bar
    expect(classifySizeClass(BANDS, { ...DEMO_PERSONA, seats_y3: 600, investment_inr_cr: 150 })).toBe(
      "Large",
    );
    expect(classifySizeClass(BANDS, { ...DEMO_PERSONA, seats_y3: 600, investment_inr_cr: 400 })).toBe(
      "Mega",
    );
  });

  it("treats a missing investment as not reaching a band that names one", () => {
    // every band here names an investment floor, so an unstated investment
    // confirms none of them, even at 600 seats
    expect(classifySizeClass(BANDS, { ...DEMO_PERSONA, seats_y3: 600, investment_inr_cr: null })).toBeNull();
    // a band that names only seats is still reachable
    expect(
      classifySizeClass(
        [{ class: "Small", min_seats: 20, min_investment_inr_cr: null }],
        { ...DEMO_PERSONA, seats_y3: 600, investment_inr_cr: null },
      ),
    ).toBe("Small");
  });

  it("ignores bands that name no threshold", () => {
    expect(
      classifySizeClass([{ class: "Enterprise", min_seats: null, min_investment_inr_cr: null }], DEMO_PERSONA),
    ).toBeNull();
  });

  it("says the band used when the class is known", () => {
    const policy = {
      ...seedRegistry.policies.find((p) => p.id === "pol_mh_2025")!,
      size_class_thresholds: BANDS,
    };
    const withBands = seedRegistry.policies.map((p) => (p.id === "pol_mh_2025" ? policy : p));
    const ctx = planContextForAsk(withBands, { ...DEMO_PERSONA, seats_y3: 600, investment_inr_cr: 400 });
    expect(ctx).toContain("Maharashtra size class for this plan: Mega");
    expect(ctx).toContain("year-3 seats 600");
    expect(ctx).toContain("investment ₹400 Cr");
    expect(ctx).toContain("Quote only the cap that applies to Mega");
    expect(ctx).not.toContain("not determinable");
  });
});

import { describe, expect, it } from "vitest";
import { checkGrounded, extractNumbers, resolveCitations } from "../lib/grounding";
import { RegistryView } from "../lib/registry";

const reg = RegistryView.load();

describe("number extraction", () => {
  it("finds ₹ amounts, percents, ranges and K suffixes", () => {
    const nums = extractNumbers("₹50,000 per month, 20% cap, 1,800-1,900 GCCs, 660K+ people");
    expect(nums.map((n) => n.value)).toEqual([50000, 20, 1800, 1900, 660000]);
  });

  it("ignores ids inside citation chips like [f402] and [pol_mh_2025]", () => {
    expect(extractNumbers("see [f402] and [pol_mh_2025]")).toEqual([]);
  });
});

describe("grounding guardrail", () => {
  it("rejects an invented number", () => {
    const res = checkGrounded("Pune will cost about ₹45.2 Cr over three years.", [], reg);
    expect(res.ok).toBe(false);
    expect(res.ungrounded).toContain("45.2");
  });

  it("rejects a number that is in the registry but not cited", () => {
    // 87 is Pune's rent [f402] but this answer cites only pol_mh_2025
    const res = checkGrounded("Rent is ₹87/sq ft/month in Pune.", ["pol_mh_2025"], reg);
    expect(res.ok).toBe(false);
    expect(res.ungrounded).toContain("87");
  });

  it("allows a cited fact's value, range text and definition wording", () => {
    const res = checkGrounded(
      "nasscom reports 1,700+ parent companies [f001] and a range of 1,800-1,900 [f007].",
      ["f001", "f007"],
      reg,
    );
    expect(res.ok).toBe(true);
  });

  it("matches ₹50K-style policy text with ₹50,000", () => {
    const res = checkGrounded(
      "Maharashtra pays up to ₹50,000 per employee per month [pol_mh_2025].",
      ["pol_mh_2025"],
      reg,
    );
    expect(res.ok).toBe(true);
  });

  it("matches a 50K token against the ₹50,000 policy wording", () => {
    const res = checkGrounded(
      "Maharashtra pays up to 50K per employee per month [pol_mh_2025].",
      ["pol_mh_2025"],
      reg,
    );
    expect(res.ok).toBe(true);
  });

  it("allows small ordinals and years, rejects other ungrounded integers", () => {
    expect(checkGrounded("There are 3 options in 2026.", [], reg).ok).toBe(true);
    expect(checkGrounded("The plan covers 40 seats growing to 120.", [], reg).ok).toBe(false);
    expect(checkGrounded("The plan covers 40 seats growing to 120.", [], reg, JSON.stringify({ seats_y1: 40, seats_y3: 120 })).ok).toBe(true);
  });

  it("allows numbers quoted from an eligibility rule reason", () => {
    const res = checkGrounded(
      "The TN scheme requires a Global 2000 company and 200+ direct employees [pol_tn_2024].",
      ["pol_tn_2024"],
      reg,
    );
    expect(res.ok).toBe(true);
  });

  it("resolves and drops unknown ids", () => {
    const res = checkGrounded("Kolkata has no figure [f999].", ["f999"], reg);
    expect(res.resolvedIds).toEqual([]);
    expect(res.ok).toBe(true);
  });

  it("keeps ids that appear only in the answer text", () => {
    const ids = resolveCitations(reg, [], "Rent is ₹87 [f402].");
    expect(ids).toEqual(["f402"]);
  });
});

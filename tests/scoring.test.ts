import { describe, expect, it } from "vitest";
import { rank, PRESET_WEIGHTS, missingComponents } from "../lib/scoring";
import { threeYear, COST_ASSUMPTIONS } from "../lib/cost";
import { RegistryView } from "../lib/registry";
import expected from "./fixtures/expected_scoring.json";
import type { NavigatorInputs } from "../lib/types";

const reg = RegistryView.load();
const persona = expected.persona as NavigatorInputs;

function byCity(rows: ReturnType<typeof rank>): Record<string, (typeof rows)[number]> {
  return Object.fromEntries(rows.map((r) => [r.city, r]));
}

describe("ranking matches expected_scoring.json (Lowest cost preset)", () => {
  const ranked = byCity(rank(reg, persona, PRESET_WEIGHTS.cost));

  it("has the same city set", () => {
    expect(Object.keys(ranked).sort()).toEqual(
      expected.ranking.map((r) => r.city).sort(),
    );
  });

  for (const exp of expected.ranking) {
    describe(`${exp.city}`, () => {
      const got = ranked[exp.city];
      it("coverage", () => expect(got.coverage).toBeCloseTo(exp.coverage, 2));
      it("score", () => {
        if (exp.score === null) expect(got.score).toBeNull();
        else expect(got.score as number).toBeCloseTo(exp.score, 1);
      });
      it("components", () => {
        for (const k of ["talent", "rent", "salary", "attrition", "incentives"] as const) {
          const e = exp.components[k];
          const g = got.components[k];
          if (e === null) expect(g).toBeNull();
          else expect(g as number).toBeCloseTo(e, 3);
        }
      });
      it("raw values", () => {
        for (const k of ["talent", "rent", "salary", "attrition", "incentives"] as const) {
          const e = exp.raw[k];
          const g = got.raw[k];
          if (e === null || e === undefined) expect(g).toBeNull();
          else expect(g as number).toBeCloseTo(e as number, 6);
        }
      });
      it("eligibility", () => {
        expect(got.eligibility.map((e) => [e.policyId, e.status, e.reasons])).toEqual(
          exp.eligibility,
        );
      });
    });
  }

  it("sort order: ranked first by score, then unranked", () => {
    const scores = rank(reg, persona, PRESET_WEIGHTS.cost).map((r) => r.score);
    expect(scores).toEqual([...scores].sort((a, b) => (a === null ? 1 : b === null ? -1 : b - a)));
  });
});

describe("preset table from 04 §7", () => {
  const cases: Record<string, [string, number][]> = {
    cost: [
      ["pune", 77.2],
      ["hyderabad", 57.2],
      ["bengaluru", 31.8],
    ],
    talent: [
      ["pune", 56.3],
      ["hyderabad", 51.5],
      ["bengaluru", 50.9],
      ["mumbai", 20.7],
      ["chennai", 13.6],
    ],
    incentives: [
      ["pune", 78.3],
      ["mumbai", 55.4],
      ["hyderabad", 38.5],
      ["bengaluru", 28.8],
      ["chennai", 17.7],
      ["ncr_gurugram", 5.1],
    ],
    balanced: [
      ["pune", 72.6],
      ["hyderabad", 54.3],
      ["bengaluru", 36.8],
      ["chennai", 29.5],
      ["mumbai", 28.2],
    ],
  };
  for (const [preset, rows] of Object.entries(cases)) {
    it(preset, () => {
      const ranked = rank(reg, persona, PRESET_WEIGHTS[preset as keyof typeof PRESET_WEIGHTS]);
      const got = ranked
        .filter((r) => r.score !== null)
        .map((r) => [r.city, r.score as number] as [string, number]);
      expect(got.length).toBe(rows.length);
      for (const [city, score] of rows) {
        const found = got.find(([c]) => c === city);
        expect(found, `${city} ranked`).toBeTruthy();
        expect(found?.[1]).toBeCloseTo(score, 1);
      }
    });
  }

  it("unranked cities carry score null and named missing components", () => {
    const ranked = byCity(rank(reg, persona, PRESET_WEIGHTS.cost));
    expect(ranked.chennai.score).toBeNull();
    expect(missingComponents(ranked.chennai.raw)).toEqual(["salary", "attrition"]);
    expect(missingComponents(ranked.mumbai.raw)).toEqual(["salary", "attrition"]);
    expect(missingComponents(ranked.ncr_gurugram.raw)).toEqual(["rent", "salary", "attrition"]);
    expect(missingComponents(ranked.ncr_noida.raw)).toEqual(["talent", "rent", "salary", "attrition"]);
  });
});

describe("weights normalise and Tier-2 stays out unless asked", () => {
  it("sliders above/below 100 re-rank without changing the preset result", () => {
    const doubled = rank(reg, persona, {
      talent: 40,
      rent: 40,
      salary: 70,
      attrition: 30,
      incentives: 20,
    });
    const base = rank(reg, persona, PRESET_WEIGHTS.cost);
    expect(doubled.map((r) => [r.city, r.score])).toEqual(base.map((r) => [r.city, r.score]));
  });

  it("Tier-2 cities join candidates only when open_to_tier2", () => {
    const closed = rank(reg, persona, PRESET_WEIGHTS.balanced).map((r) => r.city);
    expect(closed).not.toContain("indore");
    const open = rank(reg, { ...persona, open_to_tier2: true }, PRESET_WEIGHTS.balanced).map(
      (r) => r.city,
    );
    expect(open).toContain("indore");
  });
});

describe("three-year cost matches the worked example", () => {
  const totals: Record<string, number> = { pune: 4468.7, hyderabad: 5077.4, bengaluru: 5897.7 };
  for (const [city, total] of Object.entries(totals)) {
    it(city, () => {
      const est = threeYear(reg, city, persona);
      expect(est.total_lakh as number).toBeCloseTo(total, 1);
      expect(est.rows.map((r) => r.seats)).toEqual([40, 80, 120]);
    });
  }

  it("Pune 3-year total is about ₹44.69 Cr", () => {
    const est = threeYear(reg, "pune", persona);
    expect((est.total_lakh as number) / 100).toBeCloseTo(44.69, 2);
  });

  it("salary uses the 9.9% increment from Talent500", () => {
    const est = threeYear(reg, "pune", persona);
    // 40 seats × ₹15 L × 1.099^1 = 659.4 ... check year 2 scaling is 1.099 × year 1
    const y1 = est.rows[0].salary_lakh as number;
    const y2 = est.rows[1].salary_lakh as number;
    expect(y2 / (y1 * 2)).toBeCloseTo(1.099, 3);
  });

  it("lists all five assumptions on the estimate", () => {
    expect(COST_ASSUMPTIONS.map((a) => a.id)).toEqual(["A1", "A2", "A3", "A4", "A5"]);
  });
});

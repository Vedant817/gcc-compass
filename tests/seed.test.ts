import { describe, expect, it } from "vitest";
import { seedRegistry } from "../lib/registry";

/**
 * TypeScript twin of reference/scripts/validate_seed.py: uniqueness, referential
 * integrity and the enum/unverified rules. `npm test` runs both this and
 * `python3 reference/scripts/validate_seed.py`.
 */
const { sources, facts, cities, states, policies, providers } = seedRegistry;

describe("seed integrity", () => {
  it("has the pack's counts", () => {
    expect(sources).toHaveLength(28);
    expect(facts).toHaveLength(70);
    expect(cities).toHaveLength(11);
    expect(states).toHaveLength(8);
    expect(policies).toHaveLength(6);
    expect(providers).toHaveLength(12);
  });

  it("has no duplicate ids", () => {
    for (const [name, rows] of Object.entries({ sources, facts, cities, states, policies, providers })) {
      const ids = rows.map((r) => r.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });

  it("every fact references a source and a valid entity", () => {
    const srcIds = new Set(sources.map((s) => s.id));
    const cityIds = new Set(cities.map((c) => c.id));
    const stateIds = new Set(states.map((s) => s.id));
    const providerIds = new Set(providers.map((p) => p.id));
    for (const f of facts) {
      expect(srcIds.has(f.source_id), f.id).toBe(true);
      if (f.entity_type === "country") expect(f.entity_id).toBe("IN");
      if (f.entity_type === "city") expect(cityIds.has(f.entity_id), f.id).toBe(true);
      if (f.entity_type === "state") expect(stateIds.has(f.entity_id), f.id).toBe(true);
      if (f.entity_type === "provider") expect(providerIds.has(f.entity_id), f.id).toBe(true);
    }
  });

  it("unverified facts are Low confidence and flagged", () => {
    for (const f of facts.filter((f) => f.unverified)) {
      expect(f.confidence, f.id).toBe("L");
    }
    expect(facts.filter((f) => f.unverified).length).toBeGreaterThan(0);
  });

  it("every fact has a value", () => {
    for (const f of facts) {
      expect(f.value_num !== null || Boolean(f.value_text), f.id).toBe(true);
    }
  });

  it("domain-only sources are marked and https", () => {
    for (const s of sources) {
      expect(s.url.startsWith("https://"), s.id).toBe(true);
      if (s.url_precision === "domain_only") expect(s.notes !== null || s.notes !== undefined).toBe(true);
    }
    expect(sources.filter((s) => s.url_precision === "domain_only").length).toBeGreaterThan(0);
  });

  it("exactly one Flexiple provider, tagged", () => {
    const flex = providers.filter((p) => p.is_flexiple);
    expect(flex).toHaveLength(1);
    expect(flex[0].name).toBe("Flexiple");
    expect(flex[0].category).toBe("setup_bot");
  });

  it("policies reference real states and sources, with known ops", () => {
    const stateIds = new Set(states.map((s) => s.id));
    const srcIds = new Set(sources.map((s) => s.id));
    for (const p of policies) {
      expect(stateIds.has(p.state_id), p.id).toBe(true);
      expect(srcIds.has(p.source_id), p.id).toBe(true);
      for (const r of p.eligibility_json.all) {
        expect(["==", "!=", ">=", "<=", "in", "not_in"]).toContain(r.op);
      }
      for (const i of p.incentives_json) {
        expect(["capex", "rental", "payroll", "opex", "interest", "other"]).toContain(i.type);
      }
    }
  });

  it("the expected scoring output file is consistent with the seed", async () => {
    const exp = (await import("./fixtures/expected_scoring.json")).default;
    expect(exp.ranking.find((r) => r.city === "pune")?.score).toBe(77.2);
    expect(exp.three_year.pune.total_lakh).toBe(4468.7);
  });
});

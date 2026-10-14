import { describe, expect, it } from "vitest";
import { RegistryView, seedRegistry } from "../lib/registry";
import type { Fact, Source } from "../lib/types";

/**
 * The live layer is the one part of the registry that arrives from outside the
 * repo. These tests pin the rules that keep it honest, using fixtures only —
 * nothing here touches the network, which is what makes them runnable in CI.
 */

const liveSource: Source = {
  id: "src_live_worldbank",
  title: "World Bank Open Data",
  publisher: "World Bank",
  url: "https://data.worldbank.org",
  published_date: "2026-10",
  type: "api",
  reliability: "H",
  url_precision: "exact",
  notes: "Fetched at request time.",
};

const liveFact = (over: Partial<Fact> = {}): Fact => ({
  id: "live_wb_001",
  entity_type: "country",
  entity_id: "IN",
  metric: "gdp_per_capita_usd",
  // A round placeholder, not a published figure: this fixture must not be
  // mistaken for a snapshot of the live API.
  value_num: 1,
  value_text: null,
  unit: "USD",
  as_of: "2019",
  definition_note: "GDP per capita, current US dollars.",
  source_id: "src_live_worldbank",
  confidence: "L",
  verified_by_human: false,
  extracted_by: "api",
  unverified: true,
  quote: null,
  ...over,
});

const live = { sources: [liveSource], facts: [liveFact()] };

describe("merging the live layer", () => {
  it("keeps the seed untouched", () => {
    // the curated registry is the fixture the scoring tests are verified
    // against; a live merge must never reach into it
    expect(seedRegistry.facts).toHaveLength(70);
    expect(seedRegistry.sources).toHaveLength(28);
    expect(seedRegistry.facts.some((f) => f.extracted_by === "api")).toBe(false);
  });

  it("adds live facts and sources", () => {
    const reg = RegistryView.load(undefined, live);
    expect(reg.facts).toHaveLength(71);
    expect(reg.source("src_live_worldbank")).toBeDefined();
    expect(reg.fact("live_wb_001")).toBeDefined();
  });

  it("appends live rows after the seed, so numericFact keeps the curated value", () => {
    const reg = RegistryView.load(undefined, live);
    const firstLive = reg.facts.findIndex((f) => f.extracted_by === "api");
    const lastSeed = reg.facts.map((f) => f.extracted_by).lastIndexOf("human");
    expect(firstLive).toBeGreaterThan(lastSeed);
  });

  it("cannot displace a seeded score component", () => {
    // gcc_count for India is cited; a live row claiming the same metric must
    // not become the first match, or every published score would move
    const shadow = liveFact({ id: "live_wb_002", metric: "gcc_count", entity_id: "IN" });
    const clean = RegistryView.load();
    const merged = RegistryView.load(undefined, { sources: [liveSource], facts: [shadow] });
    expect(merged.numericFact("IN", "gcc_count")?.id).toBe(
      clean.numericFact("IN", "gcc_count")?.id,
    );
  });

  it("lets a human-approved overlay beat both seed and live", () => {
    const approved = liveFact({
      id: "live_wb_001",
      value_num: 9999,
      confidence: "H",
      extracted_by: "human",
      verified_by_human: true,
      unverified: false,
    });
    const reg = RegistryView.load({ sources: [], facts: [approved] }, live);
    // one row, not two: same id replaces rather than duplicates
    expect(reg.facts.filter((f) => f.id === "live_wb_001")).toHaveLength(1);
    expect(reg.fact("live_wb_001")?.value_num).toBe(9999);
  });

  it("drops a live row that carries no value at all", () => {
    const empty = liveFact({ id: "live_wb_003", value_num: null, value_text: null });
    const reg = RegistryView.load(undefined, { sources: [liveSource], facts: [empty] });
    expect(reg.fact("live_wb_003")).toBeUndefined();
  });

  it("treats an absent live layer as no live layer", () => {
    expect(RegistryView.load().facts).toHaveLength(70);
    expect(RegistryView.load({ sources: [], facts: [] }).facts).toHaveLength(70);
    expect(RegistryView.load(undefined, { sources: [], facts: [] }).facts).toHaveLength(70);
  });

  it("leaves every curated score component reading what it read before", () => {
    const clean = RegistryView.load();
    const merged = RegistryView.load(undefined, live);
    for (const city of ["pune", "hyderabad", "bengaluru"]) {
      for (const metric of ["office_rent_grade_a", "swe_ctc_mid", "attrition_pct"]) {
        expect(merged.numericFact(city, metric)?.id, `${city}/${metric}`).toBe(
          clean.numericFact(city, metric)?.id,
        );
      }
    }
  });
});

describe("honesty invariants every live row must satisfy", () => {
  it("marks itself unreviewed and low confidence", () => {
    for (const f of live.facts) {
      expect(f.unverified).toBe(true);
      expect(f.confidence).toBe("L");
      expect(f.verified_by_human).toBe(false);
      expect(f.extracted_by).toBe("api");
    }
  });

  it("carries a source that resolves", () => {
    const reg = RegistryView.load(undefined, live);
    for (const f of live.facts) {
      expect(reg.source(f.source_id), f.id).toBeDefined();
    }
  });

  it("uses an id namespace that cannot collide with seed or overlay ids", () => {
    // seed ids are f001/pol_*/src_*/c##, and nextFactId() mints f###
    expect(liveFact().id).toMatch(/^live_/);
    expect(liveSource.id).not.toMatch(/^src_(?!live_)/);
  });
});

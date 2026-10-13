import { describe, expect, it } from "vitest";
import { getLiveLayer, parseWorldBank, countryName, HQ_ISO3, EMPTY_LIVE, type WbRow } from "../lib/live";

/**
 * Pure parsing rules run everywhere. The network test is opt-in, because a
 * public API being briefly unreachable is not a reason for CI to go red.
 */
const POP: { metric: string; code: string; unit: string | null; definition: string; format: (n: number) => string } = {
  metric: "population_total",
  code: "SP.POP.TOTL",
  unit: "people",
  definition: "Total population.",
  format: (n) => Math.round(n).toLocaleString("en-IN"),
};

describe("parsing a World Bank payload", () => {
  it("turns a row into a registry fact", () => {
    const rows: WbRow[] = [{ countryiso3code: "IND", date: "2025", value: 2_702.47 }];
    const [f] = parseWorldBank(rows, POP);
    expect(f).toMatchObject({
      id: "live_wb_population_total_in",
      entity_type: "country",
      entity_id: "IN",
      value_num: 2_702.47,
      as_of: "2025",
    });
  });

  it("drops a null value rather than reporting a zero", () => {
    const rows: WbRow[] = [
      { countryiso3code: "IND", date: "2025", value: null },
      { countryiso3code: "IND", date: "2025", value: 0 },
    ];
    const facts = parseWorldBank(rows, POP);
    // a genuine zero is data; a null is the absence of an answer
    expect(facts).toHaveLength(1);
    expect(facts[0].value_num).toBe(0);
  });

  it("marks every live row unreviewed", () => {
    const facts = parseWorldBank([{ countryiso3code: "IND", date: "2025", value: 1 }], POP);
    for (const f of facts) {
      expect(f.unverified).toBe(true);
      expect(f.confidence).toBe("L");
      expect(f.verified_by_human).toBe(false);
      expect(f.extracted_by).toBe("api");
    }
  });

  it("gives each country its own id, so a batch cannot self-collide", () => {
    const facts = parseWorldBank(
      [
        { countryiso3code: "IND", date: "2025", value: 1 },
        { countryiso3code: "USA", date: "2025", value: 2 },
      ],
      POP,
    );
    expect(new Set(facts.map((f) => f.id)).size).toBe(2);
  });

  it("survives a malformed payload", () => {
    expect(parseWorldBank(undefined as unknown as WbRow[], POP)).toEqual([]);
    expect(parseWorldBank([{ date: "2025", value: 1 }], POP)).toEqual([]);
  });
});

describe("country mapping", () => {
  it("covers every HQ country the navigator form can produce", () => {
    for (const label of ["US", "UK", "Germany", "France", "Netherlands"]) {
      expect(HQ_ISO3[label], label).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("names countries rather than showing an ISO code", () => {
    expect(countryName("IN")).toBe("India");
    expect(countryName("USA")).toBe("United States");
    expect(countryName("ZZZ")).toBe("ZZZ");
  });

  it("files India under the id the seed already uses", () => {
    // the World Bank says "IND"; the registry's country id is "IN". If these
    // drifted apart, live and seeded facts about India would sit under two ids
    // and no lookup would find both.
    const [f] = parseWorldBank([{ countryiso3code: "IND", date: "2025", value: 1 }], POP);
    expect(f.entity_id).toBe("IN");
  });
});

describe("the empty layer", () => {
  it("is a valid layer with nothing in it", () => {
    expect(EMPTY_LIVE.facts).toEqual([]);
    expect(EMPTY_LIVE.sources).toEqual([]);
  });
});

// Live only: proves the endpoints answer and the shapes are right.
const live = process.env.LIVE_TESTS === "1" ? describe : describe.skip;
live("against the real World Bank API", () => {
  it("returns attributed, unreviewed facts and never throws", async () => {
    const layer = await getLiveLayer();
    expect(layer.facts.length).toBeGreaterThan(0);
    expect(layer.sources[0].publisher).toBe("World Bank");

    const ids = layer.facts.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of layer.facts) {
      expect(f.source_id).toBe("src_live_worldbank");
      expect(f.as_of).toMatch(/^\d{4}$/);
      expect(f.unverified).toBe(true);
    }
    expect(layer.facts.some((f) => f.metric === "gdp_per_capita_usd" && f.entity_id === "IN")).toBe(true);
  }, 90_000);

  it("carries a GDP per capita for each HQ country", async () => {
    const layer = await getLiveLayer();
    for (const iso3 of new Set(Object.values(HQ_ISO3))) {
      const f = layer.facts.find((x) => x.metric === "gdp_per_capita_usd" && x.entity_id === iso3);
      expect(f, iso3).toBeDefined();
      expect(f!.value_num).toBeGreaterThan(0);
    }
  }, 90_000);

  it("returns the empty layer rather than throwing when every fetch fails", async () => {
    // the shape of the guarantee, proven by asking for a layer whose indicators
    // cannot resolve: getLiveLayer must never reject
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error("network down"))) as typeof fetch;
    try {
      await expect(getLiveLayer()).resolves.toEqual(EMPTY_LIVE);
    } finally {
      globalThis.fetch = original;
    }
  }, 90_000);
});

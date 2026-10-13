import { describe, expect, it } from "vitest";
import {
  dedupeExtractedFacts,
  isReviewableFact,
  isUsableQualitativeValue,
  shapeExtractedFacts,
} from "../lib/extraction";
import type { ExtractedFactT } from "../lib/types";

function fact(over: Partial<ExtractedFactT> = {}): ExtractedFactT {
  return {
    entity_type: "state",
    entity_id: "TS",
    entity_name: "Telangana",
    metric: "gcc_policy_status",
    new_metric: false,
    value_num: null,
    value_text: null,
    unit: null,
    as_of: null,
    definition_note: null,
    quote: "State officials said a GCC policy is being considered.",
    suggested_confidence: "M",
    ...over,
  };
}

describe("qualitative values", () => {
  it("accepts a phrase that says something the quote does not say verbatim", () => {
    expect(
      isUsableQualitativeValue(
        "No dedicated GCC fiscal incentive policy is in place yet",
        "The state does not yet have a dedicated policy offering fiscal incentives.",
      ),
    ).toBe(true);
  });

  it("rejects a value that is a slice of its own quote", () => {
    const quote = "State officials said a GCC policy is being considered.";
    expect(isUsableQualitativeValue("being considered", quote)).toBe(false);
    expect(
      isUsableQualitativeValue("a GCC policy is being considered", quote),
    ).toBe(false);
  });

  it("rejects fragments that are too short to be a value", () => {
    expect(isUsableQualitativeValue("none on record", "x")).toBe(false);
  });

  it("keeps published figures and ranges, which do appear inside their quote", () => {
    expect(isUsableQualitativeValue("1,800-1,900", "The report counts 1,800-1,900 GCCs.")).toBe(true);
  });

  it("treats a numeric fact as reviewable without any value_text", () => {
    expect(isReviewableFact(fact({ value_num: 1700, value_text: null }))).toBe(true);
  });

  it("treats a quote-less row as unusable", () => {
    expect(isReviewableFact(fact({ quote: "   " }))).toBe(false);
  });
});

describe("dedupe", () => {
  it("keeps one row per entity+metric", () => {
    const rows = [
      fact({ value_text: "one phrasing of the policy status" }),
      fact({ value_text: "a fuller, more complete status phrase here" }),
    ];
    const kept = dedupeExtractedFacts(rows);
    expect(kept).toHaveLength(1);
    expect(kept[0].value_text).toBe("a fuller, more complete status phrase here");
  });

  it("prefers a number over prose for the same metric", () => {
    const kept = dedupeExtractedFacts([
      fact({ metric: "swe_ctc_mid", value_text: "about thirty lakh per year" }),
      fact({ metric: "swe_ctc_mid", value_num: 30, unit: "lakh", value_text: null }),
    ]);
    expect(kept[0].value_num).toBe(30);
  });

  it("prefers the row carrying a definition and an as-of date", () => {
    const kept = dedupeExtractedFacts([
      fact({ value_text: "the same length value text here" }),
      fact({ value_text: "the same length value text here", definition_note: "d", as_of: "2025" }),
    ]);
    expect(kept[0].definition_note).toBe("d");
  });

  it("keeps different metrics apart", () => {
    const kept = dedupeExtractedFacts([fact(), fact({ metric: "approval_process" })]);
    expect(kept).toHaveLength(2);
  });

  it("keys on the entity as well as the metric", () => {
    expect(
      dedupeExtractedFacts([fact({ entity_id: "TS" }), fact({ entity_id: "KA" })]),
    ).toHaveLength(2);
  });

  it("reports what it removed", () => {
    const shaped = shapeExtractedFacts([
      fact({ value_text: "being considered" }),
      fact({ value_text: "a readable phrase that says something" }),
      fact({ metric: "approval_process", value_text: "a readable phrase that says something" }),
    ]);
    expect(shaped.facts).toHaveLength(2);
    expect(shaped.droppedUnusable).toBe(1);
    expect(shaped.deduped).toBe(0);
  });
});

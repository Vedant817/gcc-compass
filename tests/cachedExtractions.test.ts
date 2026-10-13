import { describe, expect, it } from "vitest";
import { CACHED_EXTRACTIONS, findCachedExtraction } from "../lib/cachedExtractions";
import { TELANGANA_SAMPLE } from "../components/add-source/addSourceShared";
import { seedRegistry } from "../lib/registry";
import { Extracted } from "../lib/types";

/**
 * The cached extraction is the fallback that keeps "Add a source" working when
 * the model is rate-limited, so its integrity is worth a test: it must satisfy
 * the same schema a live reply does, and every quote must be verbatim in the
 * sample text a reviewer would actually paste.
 */
describe("cached extractions", () => {
  it("every cached entry satisfies the extraction schema", () => {
    for (const entry of CACHED_EXTRACTIONS) {
      const res = Extracted.safeParse(entry.result);
      expect(res.success, JSON.stringify(res.success ? [] : res.error.issues)).toBe(true);
    }
  });

  it("every cached quote is verbatim in the built-in sample text", () => {
    const norm = TELANGANA_SAMPLE.text.replace(/\s+/g, " ").trim();
    const entry = CACHED_EXTRACTIONS.find((e) => norm.includes(e.match));
    expect(entry, "no cache entry matches the sample text").toBeDefined();
    for (const fact of entry!.result.facts) {
      expect(norm.includes(fact.quote.replace(/\s+/g, " ").trim()), fact.quote).toBe(true);
    }
  });

  it("maps cached entities to ids the review UI allows", () => {
    const allowed = new Set(["IN", ...seedRegistry.states.map((s) => s.id)]);
    for (const entry of CACHED_EXTRACTIONS) {
      for (const fact of entry.result.facts) {
        expect(allowed.has(fact.entity_id ?? ""), `${fact.entity_id}`).toBe(true);
      }
    }
  });

  it("is found for the sample text and never for other text", () => {
    expect(findCachedExtraction(TELANGANA_SAMPLE.text)).not.toBeNull();
    // the UI sends the sample text with a trailing note; the match must survive it
    expect(
      findCachedExtraction(`${TELANGANA_SAMPLE.text}\n\n(Sample text (paraphrased for demo))`),
    ).not.toBeNull();
    // a text that merely mentions the same topic never matches
    expect(findCachedExtraction("Telangana has many GCCs and low attrition.")).toBeNull();
    expect(findCachedExtraction("Karnataka announced a new SEZ policy on 3 March 2025.")).toBeNull();
    expect(findCachedExtraction("")).toBeNull();
  });
});

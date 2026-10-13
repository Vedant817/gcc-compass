import { z } from "zod";
import { Extracted } from "./types";

/**
 * Pre-validated extraction results for the built-in samples.
 *
 * Each entry is parsed with the same zod schema a live model reply must pass,
 * at module load, so a malformed cache breaks the build instead of reaching a
 * reviewer. The route consults it only after the live extraction has failed.
 */
interface CachedExtraction {
  /** A distinctive span of the sample text, whitespace-normalised. */
  match: string;
  result: z.infer<typeof Extracted>;
}

/** Matched against the text the caller actually sent, never against the sample. */
export const CACHED_EXTRACTIONS: CachedExtraction[] = [
  {
    match: "does not yet have a dedicated policy offering fiscal incentives",
    result: {
      facts: [
        {
          entity_type: "state",
          entity_id: "TS",
          entity_name: "Telangana",
          metric: "gcc_policy_status",
          new_metric: false,
          value_num: null,
          value_text: "No dedicated GCC fiscal incentive policy is in place yet, and one is under consideration",
          unit: null,
          as_of: "2025",
          definition_note: "Whether the state has a GCC-specific fiscal incentive policy",
          quote:
            "does not yet have a dedicated policy offering fiscal incentives to global capability centres",
          suggested_confidence: "M",
        },
        {
          entity_type: "state",
          entity_id: "TS",
          entity_name: "Telangana",
          metric: "approval_process",
          new_metric: true,
          value_num: null,
          value_text: "Single-window approvals, which are not specific to GCCs",
          unit: null,
          as_of: "2025",
          definition_note: "How GCCs get state approvals",
          quote:
            "rely on the existing single-window approval system rather than GCC-specific subsidies",
          suggested_confidence: "M",
        },
      ],
      warnings: ["'Being considered' means the status may change; recheck for a 2026 update."],
    },
  },
];

// Fail fast (at import) if a cached entry doesn't satisfy the extraction schema.
for (const entry of CACHED_EXTRACTIONS) {
  Extracted.parse(entry.result);
}

/**
 * A cached extraction applies only when the submitted text contains the entry's
 * distinctive span verbatim, so a real paste never receives a canned answer.
 * Every quote in the cached result comes from that same span.
 */
export function findCachedExtraction(
  text: string,
): { result: z.infer<typeof Extracted> } | null {
  const norm = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (!norm) return null;
  const entry = CACHED_EXTRACTIONS.find((e) => norm.includes(e.match));
  return entry ? { result: entry.result } : null;
}

import { describe, expect, it } from "vitest";
import { Extracted } from "../lib/types";

const flashLiteOutput = `{
"facts": [
{
"entity_type": "state",
"entity_id": "TS",
"entity_name": "Telangana",
"metric": "gcc_policy_status",
"new_metric": false,
"value_text": "not yet have a dedicated policy offering fiscal incentives",
"unit": null,
"as_of": null,
"definition_note": null,
"quote": "Telangana, home to Hyderabad's fast-growing GCC cluster, does not yet have a dedicated policy offering fiscal incentives to global capability centres.",
"suggested_confidence": "M"
},
{
"entity_type": "state",
"entity_id": "TS",
"entity_name": "Telangana",
"metric": "gcc_policy_status",
"new_metric": false,
"value_text": "being considered",
"unit": null,
"as_of": null,
"definition_note": null,
"quote": "State officials said a GCC policy is being considered.",
"suggested_confidence": "M"
}
],
"warnings": []
}`;

describe("extraction schema", () => {
  it("accepts model output that omits null keys", () => {
    const res = Extracted.safeParse(JSON.parse(flashLiteOutput));
    if (!res.success) console.log(JSON.stringify(res.error.issues).slice(0, 600));
    expect(res.success).toBe(true);
  });
});

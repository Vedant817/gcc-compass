/**
 * Plan links are pure URL encoding (07 Option A): the plan id is the inputs +
 * weights, compressed and made URL-safe, so a shared link reopens the exact
 * same plan with no database.
 */
import { compressToBase64, decompressFromBase64 } from "lz-string";
import { NavigatorInputsSchema, WeightsSchema, type NavigatorInputs, type Weights } from "./types";

export interface PlanPayload {
  inputs: NavigatorInputs;
  weights: Weights;
  priority: NavigatorInputs["priority"];
  created_at: string;
}

/** Base64url so the plan id survives URL routing untouched. */
function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_");
}
function fromUrlSafe(s: string): string {
  return s.replace(/-/g, "+").replace(/_/g, "/");
}

export function encodePlan(p: PlanPayload): string {
  return toUrlSafe(compressToBase64(JSON.stringify(p)));
}

export function decodePlan(id: string): PlanPayload | null {
  try {
    const json = decompressFromBase64(fromUrlSafe(id));
    if (!json) return null;
    const raw = JSON.parse(json) as Record<string, unknown>;
    const inputs = NavigatorInputsSchema.parse(raw.inputs);
    const weights = WeightsSchema.parse(raw.weights);
    const priority = inputs.priority;
    const created_at = typeof raw.created_at === "string" ? raw.created_at : new Date().toISOString();
    return { inputs, weights, priority, created_at };
  } catch {
    return null;
  }
}

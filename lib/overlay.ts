/**
 * Browser overlay: AI-approved facts, new sources, leads and the latest plan
 * live in localStorage so they survive a refresh in the browser (07 Option A).
 * The seed itself is never modified.
 */
import type { Fact, NavigatorInputs, Source, Weights } from "./types";

const OVERLAY_KEY = "gcc_compass_overlay_v1";
const LEADS_KEY = "gcc_compass_leads_v1";
const PLAN_KEY = "gcc_compass_plan_v1";

export interface Overlay {
  sources: Source[];
  facts: Fact[];
}

export interface Lead {
  id: string;
  plan_id: string | null;
  name: string;
  email: string;
  note: string;
  consent: boolean;
  created_at: string;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works in-session */
  }
}

export function readOverlay(): Overlay {
  const o = read<Overlay>(OVERLAY_KEY, { sources: [], facts: [] });
  return { sources: o.sources ?? [], facts: o.facts ?? [] };
}

export function writeOverlay(o: Overlay): void {
  write(OVERLAY_KEY, o);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gcc-compass:overlay"));
  }
}

export function readOverlayFacts(): Fact[] {
  return readOverlay().facts;
}

export function readLeads(): Lead[] {
  return read<Lead[]>(LEADS_KEY, []);
}

export function appendLead(lead: Lead): void {
  write(LEADS_KEY, [...readLeads(), lead]);
}

export interface StoredPlan {
  inputs: NavigatorInputs;
  weights: Weights;
  priority: NavigatorInputs["priority"];
  saved_at: string;
}

export function readStoredPlan(): StoredPlan | null {
  return read<StoredPlan | null>(PLAN_KEY, null);
}

export function writeStoredPlan(plan: StoredPlan): void {
  write(PLAN_KEY, plan);
}

/** Next free fact id: one past the highest f### id the registry has ever issued. */
export function nextFactId(existing: Fact[]): string {
  let max = 0;
  for (const f of existing) {
    const m = /^f(\d{3,})$/.exec(f.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `f${String(max + 1).padStart(3, "0")}`;
}

/** Next free source id for a brand-new source, past every src_N the registry has issued. */
export function nextSourceId(existing: Source[]): string {
  let max = 0;
  for (const s of existing) {
    const m = /^src_(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `src_${max + 1}`;
}

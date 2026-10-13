import citiesJson from "../data/seed/cities.json";
import factsJson from "../data/seed/facts.json";
import policiesJson from "../data/seed/policies.json";
import providersJson from "../data/seed/providers.json";
import sourcesJson from "../data/seed/sources.json";
import statesJson from "../data/seed/states.json";
import type { Overlay } from "./overlay";
import {
  RegistrySchema,
  type City,
  type Fact,
  type Policy,
  type Provider,
  type Source,
  type State,
} from "./types";

export type { City, Fact, Policy, Provider, Source, State };

/**
 * The registry is the seed, validated with zod at module load. Nothing in here
 * invents, merges or averages facts: conflicts are multiple rows, and every
 * getter returns them all.
 */
export const seedRegistry: import("./types").Registry = RegistrySchema.parse({
  sources: sourcesJson,
  facts: factsJson,
  cities: citiesJson,
  states: statesJson,
  policies: policiesJson,
  providers: providersJson,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Best (year, month) hidden in an as-of string like "2025-07", "FY2024", "end-2024", "Q4-2025". */
function stampOf(s: string): [number, number] | null {
  const m = /(\d{4})(?:-(\d{2}))?/.exec(s);
  if (!m) return null;
  const month = m[2] ? Number(m[2]) : 0;
  return [Number(m[1]), month];
}

/** Latest as-of stamp across facts and source publication dates, formatted plainly. */
export function latestAsOf(
  facts: Fact[] = seedRegistry.facts,
  sources: Source[] = seedRegistry.sources,
): string {
  let bestYear = 0;
  let bestMonth = -1;
  const consider = (s: string | null) => {
    if (!s) return;
    const v = stampOf(s);
    if (!v) return;
    if (v[0] > bestYear || (v[0] === bestYear && v[1] > bestMonth)) {
      bestYear = v[0];
      bestMonth = v[1];
    }
  };
  for (const f of facts) consider(f.as_of);
  for (const s of sources) consider(s.published_date);
  if (!bestYear) return "unknown";
  return bestMonth === 0 ? String(bestYear) : `${MONTHS[bestMonth - 1]} ${bestYear}`;
}

export class RegistryView {
  constructor(
    public sources: Source[],
    public facts: Fact[],
    public cities: City[],
    public states: State[],
    public policies: Policy[],
    public providers: Provider[],
  ) {}

  /**
   * Merge the three layers, in increasing order of authority:
   *
   *   seed  the curated registry, bundled at build time
   *   live  facts fetched from a public API at request time
   *   overlay  facts a person approved in this browser
   *
   * Order matters twice over. Later rows land later in the array, and
   * `numericFact` returns the *first* match, so appending keeps a live row from
   * silently displacing a curated figure that the scoring model is verified
   * against. Live data is additive context; it never moves a published number.
   * A human-approved fact still wins over both, so it goes last.
   */
  static load(
    overlay: Overlay = { sources: [], facts: [] },
    live: Overlay = { sources: [], facts: [] },
  ): RegistryView {
    const overlaySources = overlay.sources ?? [];
    const overlayFacts = overlay.facts ?? [];
    const liveSources = live.sources ?? [];
    const liveFacts = live.facts ?? [];
    const hasValue = (f: Fact) => f.value_num !== null || f.value_text !== null;
    // Each layer masks the ones beneath it. Seeding the exclusion set from every
    // layer keeps a later row from being shadowed by an earlier one carrying the
    // same id, which is how an approved fact ends up duplicated instead of
    // replacing what it supersedes.
    const overlayFactIds = new Set(overlayFacts.map((f) => f.id));
    const overlaySourceIds = new Set(overlaySources.map((s) => s.id));

    const sourceIds = new Set([
      ...overlaySourceIds,
      ...liveSources.map((s) => s.id),
    ]);
    const sources = [
      ...seedRegistry.sources.filter((s) => !sourceIds.has(s.id)),
      ...liveSources.filter((s) => !overlaySourceIds.has(s.id)),
      ...overlaySources,
    ];
    const factIds = new Set([...overlayFactIds, ...liveFacts.map((f) => f.id)]);
    // a row with an existing id replaces it; others are appended
    const merged = [
      ...seedRegistry.facts.filter((f) => !factIds.has(f.id)),
      ...liveFacts.filter((f) => !overlayFactIds.has(f.id)).filter(hasValue),
      ...overlayFacts.filter(hasValue),
    ];
    return new RegistryView(
      sources,
      merged,
      seedRegistry.cities,
      seedRegistry.states,
      seedRegistry.policies,
      seedRegistry.providers,
    );
  }

  fact(id: string): Fact | undefined {
    return this.facts.find((f) => f.id === id);
  }
  source(id: string | null | undefined): Source | undefined {
    if (!id) return undefined;
    return this.sources.find((s) => s.id === id);
  }
  city(id: string): City | undefined {
    return this.cities.find((c) => c.id === id);
  }
  cityName(id: string): string {
    return this.city(id)?.name ?? id;
  }
  state(id: string): State | undefined {
    return this.states.find((s) => s.id === id);
  }
  stateForCity(cityId: string): State | undefined {
    const c = this.city(cityId);
    return c ? this.state(c.state_id) : undefined;
  }
  policy(id: string): Policy | undefined {
    return this.policies.find((p) => p.id === id);
  }

  /** All facts for an entity+metric, in registry order. Conflicts stay separate. */
  factsFor(entityId: string, metric?: string): Fact[] {
    return this.facts.filter(
      (f) => f.entity_id === entityId && (metric === undefined || f.metric === metric),
    );
  }

  /** First numeric fact for entity+metric, optionally pinned to one source. Mirrors reference_scoring.fact(). */
  numericFact(entityId: string, metric: string, sourceId?: string): Fact | undefined {
    return this.facts.find(
      (f) =>
        f.entity_id === entityId &&
        f.metric === metric &&
        f.value_num !== null &&
        (sourceId === undefined || f.source_id === sourceId),
    );
  }

  policiesForState(stateId: string): Policy[] {
    return this.policies.filter((p) => p.state_id === stateId);
  }

  providersByCategory(category: Provider["category"]): Provider[] {
    return this.providers.filter((p) => p.category === category);
  }

  get counts(): { facts: number; sources: number; updated: string } {
    return {
      facts: this.facts.length,
      sources: this.sources.length,
      updated: latestAsOf(this.facts, this.sources),
    };
  }

  /** Facts for a metric. Conflicts stay separate; no winner is picked here. */
  factsByMetric(metric: string): Fact[] {
    return this.facts.filter((f) => f.metric === metric);
  }
}

/** The single source of truth for the "one methodology across cities" rent pin. */
export const RENT_SOURCE_ID = "src_office_annual_2025";

export const registry = RegistryView.load();


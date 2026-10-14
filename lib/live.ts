/**
 * The live layer: context fetched from a public API at request time, merged
 * into the registry alongside the curated seed.
 *
 * Why it is additive rather than a replacement, stated once here because it
 * governs every line below: the seed's value is its provenance. Every figure in
 * it was read by a person who recorded where it came from - a named source, an
 * as-of date, a confidence level - and competing figures are kept as separate
 * rows rather than reconciled. (Not a verbatim quote: quotes exist only on facts
 * a reviewer extracted through /add-source.) A JSON API has none of that, so a
 * live row can never claim the same authority. It is context the seed has no way
 * to provide, not a better copy of what the seed already knows.
 *
 * Three rules make that safe:
 *
 *   1. It never throws. Every source is settled independently, so one dead
 *      endpoint costs you its own rows and nothing else. A failed fetch leaves
 *      the app exactly as it was before this file existed.
 *   2. It never overrides. `RegistryView.load` appends live rows after the seed,
 *      and `numericFact` returns the first match, so a live figure can not
 *      displace a curated one. See lib/registry.ts.
 *   3. It never claims to be read. Live rows are Low confidence and Unverified
 *      and say so in the UI, because nobody has checked them.
 *
 * Source: World Bank Open Data, CC BY 4.0. Attribution is rendered wherever a
 * live row appears, as the licence requires and as this app does for every
 * other source.
 */
import { FactSchema, type Fact, type Source } from "./types";

export interface LiveLayer {
  sources: Source[];
  facts: Fact[];
}

export const EMPTY_LIVE: LiveLayer = { sources: [], facts: [] };

/**
 * World Bank revisions land annually and its API has published no rate limit.
 * Six hours is short enough that a reader isn't looking at last year's number
 * for long, and long enough that traffic doesn't turn into an outbound call
 * per page view.
 */
const REVALIDATE_SECONDS = 21_600;
/**
 * Generous, because the World Bank is a free public API: a cold DNS lookup plus
 * TLS plus a six-country batch has been observed at just over 5s, and a timeout
 * that fires on a slow-but-successful response would drop real data rather than
 * fail honestly. Four requests run in parallel, so this is the page's floor.
 */
const FETCH_TIMEOUT_MS = 20_000;

/** Attribution and licence live here because this string ships to the UI. */
export const WORLD_BANK = {
  id: "src_live_worldbank",
  title: "World Bank Open Data",
  publisher: "World Bank",
  url: "https://data.worldbank.org/indicator",
  type: "api" as const,
  notes: "World Bank Open Data, CC BY 4.0. Fetched at page load, not reviewed by a person.",
};

const WB_BASE = "https://api.worldbank.org/v2";

/**
 * The navigator's HQ-country labels, mapped to ISO3. Only the countries the
 * form can actually produce are listed: the World Bank endpoint is a fixed
 * allowlist rather than whatever a caller sends, so a bad value can't become an
 * arbitrary outbound request.
 */
export const HQ_ISO3: Record<string, string> = {
  US: "USA",
  UK: "GBR",
  Germany: "DEU",
  France: "FRA",
  Netherlands: "NLD",
};

const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  USA: "United States",
  GBR: "United Kingdom",
  DEU: "Germany",
  FRA: "France",
  NLD: "Netherlands",
};

/**
 * The World Bank speaks ISO3 ("IND"), the registry's own country id is "IN".
 * Normalising here keeps a live row addressable by the same entity the seed
 * uses, so `entity_id === "IN"` finds both rather than silently splitting the
 * country across two ids.
 */
function entityIdFor(iso3: string): string {
  return iso3 === "IND" ? "IN" : iso3;
}

export function countryName(id: string): string {
  return COUNTRY_NAMES[id] ?? id;
}

interface Indicator {
  /** Registry metric name. What the UI and the scoring model speak. */
  metric: string;
  /** World Bank series code. What the API speaks. The two are unrelated. */
  code: string;
  unit: string | null;
  definition: string;
  /** Formatted here so the value reads as a person wrote it, not as an API did. */
  format: (n: number) => string;
}

/**
 * Indicators worth carrying. Unemployment was tried and dropped: it timed out
 * from this deployment more often than it answered, and a metric that is
 * sometimes absent is worse than one that is honestly missing.
 */
const GDP_PCAP: Indicator = {
  metric: "gdp_per_capita_usd",
  code: "NY.GDP.PCAP.CD",
  unit: "USD",
  definition: "GDP per capita, current US dollars, from the World Bank Open Data.",
  format: (n) => `$${Math.round(n).toLocaleString("en-IN")}`,
};

const GDP_PCAP_PPP: Indicator = {
  metric: "gdp_per_capita_ppp_usd",
  code: "NY.GDP.PCAP.PP.CD",
  unit: "USD",
  definition:
    "GDP per capita at purchasing-power parity, current international dollars. Adjusts for what the same money buys in each country.",
  format: (n) => `$${Math.round(n).toLocaleString("en-IN")}`,
};

const POPULATION: Indicator = {
  metric: "population_total",
  code: "SP.POP.TOTL",
  unit: "people",
  definition: "Total population, from the World Bank Open Data.",
  // en-IN grouping, matching how the rest of the app prints Indian numbers
  format: (n) => Math.round(n).toLocaleString("en-IN"),
};

const GDP_GROWTH: Indicator = {
  metric: "gdp_growth_pct",
  code: "NY.GDP.MKTP.KD.ZG",
  unit: "%",
  definition: "Annual GDP growth, from the World Bank Open Data.",
  format: (n) => `${n.toFixed(1)}%`,
};

/** One row of the World Bank v2 response. Only the fields used here are typed. */
export interface WbRow {
  countryiso3code?: string;
  date?: string;
  value?: number | null;
}

function liveFact(args: {
  iso3: string;
  indicator: Indicator;
  row: WbRow;
  value: string;
}): Fact | null {
  const { iso3, indicator, row, value } = args;
  const year = row.date;
  const numeric = typeof row.value === "number" ? row.value : null;
  const entity = entityIdFor(iso3);
  if (!entity || !year || numeric === null) return null;
  return {
    id: `live_wb_${indicator.metric}_${entity.toLowerCase()}`,
    entity_type: "country",
    entity_id: entity,
    metric: indicator.metric,
    value_num: numeric,
    value_text: value,
    unit: indicator.unit,
    as_of: year,
    definition_note: indicator.definition,
    source_id: WORLD_BANK.id,
    // Nobody has read this. It says so in all three places that can.
    confidence: "L",
    verified_by_human: false,
    extracted_by: "api",
    unverified: true,
    quote: null,
  };
}

/**
 * Turn a World Bank payload into registry rows. Pure, so the parsing rules are
 * testable without a network — including the rule that a null value is dropped
 * rather than rendered as a zero.
 */
export function parseWorldBank(rows: WbRow[], indicator: Indicator): Fact[] {
  const facts: Fact[] = [];
  for (const row of rows ?? []) {
    const fact = liveFact({
      iso3: row.countryiso3code ?? "",
      indicator,
      row,
      value: typeof row.value === "number" ? indicator.format(row.value) : "",
    });
    if (fact) facts.push(fact);
  }
  return facts;
}

async function fetchIndicator(countries: string[], indicator: Indicator): Promise<Fact[]> {
  const url =
    `${WB_BASE}/country/${countries.join(";")}/indicator/${indicator.code}` +
    `?format=json&per_page=50&mrv=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "gcc-compas/0.1 (research tool)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`World Bank ${indicator.code}: HTTP ${res.status}`);
  const body = (await res.json()) as [unknown, WbRow[] | null];
  // v2 answers [meta, rows] on success and a bare error object otherwise - and
  // an unknown series code still answers 200. Returning [] silently here is
  // what let a wrong indicator code look like a working API returning no data,
  // so the shape mismatch is logged rather than swallowed.
  if (!Array.isArray(body) || !Array.isArray(body[1])) {
    throw new Error(`World Bank ${indicator.code}: unexpected response shape`);
  }
  const parsed = parseWorldBank(body[1], indicator);
  // re-checked because these rows crossed a network boundary
  return parsed.filter((f) => FactSchema.safeParse(f).success);
}

const worldBankSource: Source = {
  id: WORLD_BANK.id,
  title: WORLD_BANK.title,
  publisher: WORLD_BANK.publisher,
  url: WORLD_BANK.url,
  published_date: null,
  type: WORLD_BANK.type,
  // the publisher is authoritative for its own statistics; that is a statement
  // about the World Bank, not about whether a person here has checked the row
  reliability: "H",
  url_precision: "exact",
  notes: WORLD_BANK.notes,
};

/**
 * India and every HQ country the navigator can produce, in one batched request
 * per indicator. The World Bank separates countries with a semicolon in the
 * path; a comma is rejected.
 */
const GDP_PCAP_COUNTRIES = ["IN", ...new Set(Object.values(HQ_ISO3))];

/**
 * The live layer, or the empty layer. Never rejects: each indicator is settled
 * on its own so a timeout costs one metric rather than the whole page.
 */
export async function getLiveLayer(): Promise<LiveLayer> {
  const indicators: Array<[string[], Indicator]> = [
    [GDP_PCAP_COUNTRIES, GDP_PCAP],
    [["IN"], GDP_PCAP_PPP],
    [["IN"], POPULATION],
    [["IN"], GDP_GROWTH],
  ];
  const settled = await Promise.allSettled(
    indicators.map(([countries, indicator]) => fetchIndicator(countries, indicator)),
  );

  const facts: Fact[] = [];
  settled.forEach((result, i) => {
    if (result.status === "rejected") {
      // one line, no stack: a public API failing is expected, not exceptional
      console.error(
        `[live] ${indicators[i][1].code} unavailable: ${String(result.reason).slice(0, 120)}`,
      );
      return;
    }
    facts.push(...result.value);
  });

  // No rows means no source: a credit line with nothing under it is noise.
  return facts.length === 0 ? EMPTY_LIVE : { sources: [worldBankSource], facts };
}

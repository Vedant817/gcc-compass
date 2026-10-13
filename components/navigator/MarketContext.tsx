"use client";

import type { RegistryView } from "@/lib/registry";
import { HQ_ISO3, WORLD_BANK, countryName } from "@/lib/live";
import type { Fact, NavigatorInputs } from "@/lib/types";
import { Card, Table, Td, Th, Tr } from "@/components/ui/table";
import { LiveFetchBadge } from "@/components/ui/badge";

/**
 * What India costs next to the HQ country the reader picked, from the World Bank.
 *
 * This panel is context and nothing else. No figure in it reaches the score, the
 * eligibility test or the cost estimate: those read the seed registry, and
 * `RegistryView.load` appends live rows after it, so a live figure can never
 * displace a curated one. What it buys is the one comparison the seed cannot
 * make, because the seed has no country-level macro figures at all.
 *
 * Two honesty rules the layout follows:
 *
 *   - Nothing here is implied to be missing when it is merely absent. An empty
 *     live layer prints one muted line saying the context is unavailable. It
 *     never prints a zero, and never prints a dash where a dash would read as
 *     "we looked and there is nothing".
 *   - Every figure carries its own as-of year and the live badge. A number with
 *     no year on it invites a reader to treat a 2025 figure as current fact.
 */
export function MarketContext({
  reg,
  inputs,
}: {
  reg: RegistryView;
  inputs: NavigatorInputs;
}) {
  // "Other EU" and "Other" are not countries, so there is no ISO3 to ask the
  // World Bank about. India still stands on its own; the comparison column is
  // dropped rather than faked from the nearest named member state.
  const hqIso: string | undefined = HQ_ISO3[inputs.hq_country];

  const rows = FIGURES.map((f) => ({
    ...f,
    india: reg.numericFact("IN", f.metric),
    hq: hqIso && f.comparable ? reg.numericFact(hqIso, f.metric) : undefined,
  })).filter((r) => r.india || r.hq);

  return (
    <Card
      title="Market context"
      aside={<span className="text-xs text-muted">Context only — not part of the score</span>}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Market context is unavailable right now.</p>
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Figure</Th>
                <Th numeric>India</Th>
                {hqIso && <Th numeric>{countryName(hqIso)}</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Tr key={r.metric}>
                  <Td>{r.label}</Td>
                  <Td numeric>
                    <FigureCell fact={r.india} missing="India was not in this fetch." />
                  </Td>
                  {hqIso && (
                    <Td numeric>
                      <FigureCell
                        fact={r.hq}
                        missing={`Not fetched for ${countryName(hqIso)}.`}
                      />
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="text-xs text-muted mt-2">{attribution(inputs.hq_country, hqIso)}</p>
        </>
      )}
    </Card>
  );
}

/** The World Bank figures worth carrying here, and which ones have a comparison. */
const FIGURES: { metric: string; label: string; comparable: boolean }[] = [
  {
    metric: "gdp_per_capita_usd",
    label: "GDP per capita, current US$",
    comparable: true,
  },
  {
    // Purchasing-power parity and growth are fetched for India only, so a
    // third column cell for them would be a dash in every row that says
    // nothing. They are marked not comparable instead. The label stays short
    // because the full definition is on the figure's tooltip.
    metric: "gdp_per_capita_ppp_usd",
    label: "GDP per capita, PPP",
    comparable: false,
  },
  { metric: "gdp_growth_pct", label: "GDP growth, year on year", comparable: false },
];

function FigureCell({ fact, missing }: { fact: Fact | undefined; missing: string }) {
  if (!fact) {
    return (
      <span className="text-muted" title={missing}>
        —
      </span>
    );
  }
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="font-medium" title={fact.definition_note ?? undefined}>
        {fact.value_text ?? fact.value_num?.toLocaleString("en-IN")}
      </span>
      <span className="flex items-center justify-end gap-1.5 text-[11px] leading-4 text-muted">
        {fact.as_of}
        {/* The badge marks the row's provenance, so it is keyed to the source
            rather than to this card: a curated figure that lands here later
            must not be labelled "live API". */}
        {fact.source_id === WORLD_BANK.id && <LiveFetchBadge />}
      </span>
    </span>
  );
}

/**
 * The licence requires the credit, and the reader is owed the limits of the
 * figure in the same breath as the figure itself.
 */
function attribution(hqLabel: string, hqIso: string | undefined): string {
  const base =
    "Live from the World Bank Open Data (CC BY 4.0). Fetched at page load; not reviewed by a " +
    "person and not part of the score.";
  if (!hqIso) {
    return (
      `${base} “${hqLabel}” is not one of the countries this fetch covers, so there is no ` +
      "comparison figure against it."
    );
  }
  return `${base} Purchasing-power parity and growth are fetched for India only.`;
}
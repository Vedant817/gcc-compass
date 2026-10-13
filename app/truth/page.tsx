import { TruthView, type TruthPreset } from "@/components/TruthView";
import { RENT_SOURCE_ID } from "@/lib/registry";
import { getLiveLayer } from "@/lib/live";

export const metadata = {
  title: "Truth table · GCC Compass",
};

const PRESETS: TruthPreset[] = [
  {
    id: "india_count",
    label: "GCCs in India (count)",
    intro:
      "Every published answer to “how many GCCs are in India”. No winner is picked and nothing is averaged.",
    bars: [{ metric: "gcc_count", entity: "IN", shade: "primary" }],
    toggleCentres: true,
  },
  {
    id: "city_count",
    label: "GCCs in a city",
    intro:
      "The same city counted by different publishers, on different dates, with different definitions.",
    bars: [
      { metric: "gcc_count", shade: "primary" },
      { metric: "gcc_centre_count", shade: "secondary" },
    ],
    cityChoice: true,
    defaultCity: "bengaluru",
  },
  {
    id: "projection",
    label: "2030 projection, India",
    intro: "Forecasts for the number of GCCs in India in 2030, as published.",
    bars: [{ metric: "gcc_count_2030_projection", entity: "IN", shade: "primary" }],
  },
  {
    id: "rent",
    label: "Grade A office rent by city",
    intro:
      "One bar per city from a single methodology. Where another publisher gives a different figure for the same city, it stays in the table below.",
    oneBarPerCity: {
      metric: "office_rent_grade_a",
      sourceId: RENT_SOURCE_ID,
      unit: "₹/sq ft/month",
    },
  },
  {
    id: "talent",
    label: "Share of GCC talent by city",
    intro: "Zinnov's FY2025 share of India GCC talent by city, with the talent pool each share stands on.",
    oneBarPerCity: { metric: "gcc_talent_share_pct" },
  },
  {
    id: "macro",
    label: "Market context (live API)",
    intro:
      "Not GCC data. These are World Bank indicators fetched when this page loads, so there is only one publisher and nothing to disagree about. Nobody here has read them: they are context, and no score on this site depends on them.",
    bars: [{ metric: "gdp_per_capita_usd", shade: "primary" }],
    allEntities: true,
    labelEntity: true,
  },
];

/** /truth?metric=gcc_policy_status deep links to a metric added by a reviewer. */
function presetForMetric(metric: string): TruthPreset | null {
  if (PRESETS.some((p) => p.bars?.some((b) => b.metric === metric))) return null;
  return {
    id: "metric_deep_link",
    label: metric,
    intro: `Every published figure for the metric ${metric}, from every entity that has one.`,
    bars: [{ metric, shade: "primary" }],
    allEntities: true,
  };
}

export default async function TruthPage({ searchParams }: { searchParams?: { metric?: string } }) {
  // Live rows are appended to the registry, never allowed to replace a curated
  // one, and a failed fetch leaves the page exactly as it was before this call.
  const live = await getLiveLayer();
  const deepLink = searchParams?.metric ? presetForMetric(searchParams.metric) : null;
  const presets = deepLink ? [deepLink, ...PRESETS] : PRESETS;
  return (
    <>
      <h1>Truth table</h1>
      <p className="text-sm text-muted mb-5 max-w-2xl">
        Every published answer to one question, side by side. Each row keeps its source, date,
        definition and confidence; where sources disagree, they stay apart.
      </p>
      <TruthView presets={presets} live={live} />
    </>
  );
}

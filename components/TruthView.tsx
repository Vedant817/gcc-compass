"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RegistryView } from "@/lib/registry";
import { readOverlay } from "@/lib/overlay";
import type { Fact } from "@/lib/types";
import { ConfidenceBadge, SiteLinkFlag, UnverifiedBadge } from "@/components/ui/badge";
import { renderInline } from "@/lib/markdown";
import { Card, EmptyState, SkeletonRows, Table, Td, Th, Tr } from "@/components/ui/table";
import { factValue, inrNum } from "@/lib/format";

export interface BarSpec {
  metric: string;
  entity?: string; // omit for "every city with this metric"
  shade: "primary" | "secondary";
}

export interface TruthPreset {
  id: string;
  label: string;
  intro: string;
  bars?: BarSpec[];
  /** comparison mode: one bar per city, using one methodology */
  oneBarPerCity?: { sourceId?: string; metric: string; unit?: string };
  defaultCity?: string;
  cityChoice?: boolean;
  toggleCentres?: boolean;
  /** every entity with the metric, not just India (used by the /truth?metric= deep link) */
  allEntities?: boolean;
}

const CITY_CHOICES = ["bengaluru", "hyderabad", "pune", "chennai"];

interface BarDatum {
  key: string;
  label: string;
  value_num: number;
  valueLabel: string;
  shortLabel: string;
  rangeMax: number | null;
  shade: "primary" | "secondary";
  fact: Fact;
}

export function TruthView({ presets }: { presets: TruthPreset[] }) {
  const reg = useMemo(() => RegistryView.load(readOverlay()), []);
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "");
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];
  const [city, setCity] = useState(preset?.defaultCity ?? CITY_CHOICES[0]);
  const [showCentres, setShowCentres] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(900);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const measure = () => setChartWidth(el.clientWidth || 900);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setCity(preset?.defaultCity ?? CITY_CHOICES[0]);
    setShowCentres(false);
  }, [preset?.id, preset?.defaultCity]);

  const bars = useMemo<BarDatum[]>(() => {
    if (!preset) return [];
    if (preset.oneBarPerCity) {
      const { metric, sourceId } = preset.oneBarPerCity;
      return reg.cities
        .map((c) => {
          const f = reg.numericFact(c.id, metric, sourceId);
          return f ? ({ fact: f } as { fact: Fact }) : null;
        })
        .filter((x): x is { fact: Fact } => x !== null)
        .map(({ fact }) => ({
          key: fact.id,
          label: reg.cityName(fact.entity_id),
          value_num: fact.value_num as number,
          valueLabel: factValue(fact),
          shortLabel: fact.value_text ?? inrNum(fact.value_num as number),
          rangeMax: null,
          shade: "primary" as const,
          fact,
        }));
    }
    const specs = [...(preset.bars ?? [])];
    if (preset.toggleCentres && showCentres) {
      specs.push({ metric: "gcc_centre_count", entity: "IN", shade: "secondary" });
      specs.push({ metric: "gcc_count_records", entity: "IN", shade: "secondary" });
    }
    const out: BarDatum[] = [];
    for (const spec of specs) {
      let facts: Fact[];
      if (spec.entity) facts = reg.factsFor(spec.entity, spec.metric);
      else if (preset.cityChoice) facts = reg.factsFor(city, spec.metric);
      else if (preset.allEntities) facts = reg.factsByMetric(spec.metric);
      else facts = reg.factsByMetric(spec.metric).filter((f) => f.entity_id === "IN");
      for (const f of facts) {
        if (f.value_num === null) continue; // qualitative facts stay in the table only
        const src = reg.source(f.source_id);
        out.push({
          key: f.id,
          label: `${sourceLabel(src, f.source_id)} · ${f.as_of}`,
          value_num: f.value_num,
          valueLabel: withUnit(factValue(f), f.unit),
          shortLabel: withUnit(f.value_text ?? inrNum(f.value_num as number), f.unit),
          rangeMax: rangeMaxOf(f),
          shade: spec.shade,
          fact: f,
        });
      }
    }
    return out;
  }, [preset, showCentres, city, reg]);

  const tableFacts = useMemo(() => {
    if (!preset) return [];
    if (preset.oneBarPerCity) {
      return reg.factsByMetric(preset.oneBarPerCity.metric);
    }
    const metrics = new Set((preset.bars ?? []).map((b) => b.metric));
    if (preset.toggleCentres && showCentres) {
      metrics.add("gcc_centre_count");
      metrics.add("gcc_count_records");
    }
    return [...metrics]
      .flatMap((m) => {
        if (preset.cityChoice) return reg.factsFor(city, m);
        if (preset.allEntities) return reg.factsByMetric(m);
        return reg.factsByMetric(m).filter((f) => f.entity_id === "IN");
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [preset, showCentres, city, reg]);

  const headline = useMemo(() => {
    const primary = preset?.oneBarPerCity
      ? bars
      : bars.filter((b) => b.shade === "primary");
    const vals = primary.map((b) => b.rangeMax ?? b.value_num);
    if (!vals.length) return null;
    const min = Math.min(...primary.map((b) => b.value_num));
    const max = Math.max(...vals);
    const sources = new Set(primary.map((b) => b.fact.source_id));
    const spread = min > 0 ? Math.round(((max - min) / min) * 100) : 0;
    return { count: sources.size, min, max, spread, n: primary.length };
  }, [bars, preset]);

  const domainMax = useMemo(
    () => Math.max(...bars.map((b) => b.rangeMax ?? b.value_num), 1),
    [bars],
  );
  // round the axis up to a nice number so the longest bar doesn't end on the
  // plot edge, where its value label collides with the axis
  const axisMax = useMemo(() => niceMax(domainMax), [domainMax]);
  const axisWidth = Math.max(150, Math.min(250, Math.round(chartWidth * 0.36)));
  // narrow charts get a compact label set: shorter category and value labels,
  // and a smaller right margin, so nothing wraps or collides
  const compact = chartWidth < 700;
  // Ranges carry a whisker past the bar, and their labels start past that, so
  // they need more room on the right than a plain figure does.
  const hasRange = bars.some((b) => b.rangeMax !== null && b.rangeMax > b.value_num);
  const chartMargin = compact
    ? { top: 4, right: hasRange ? 108 : 84, bottom: 24, left: 4 }
    : { top: 4, right: hasRange ? 168 : 150, bottom: 24, left: 8 };
  // One label height of clearance between rows: the longest bars finish at
  // almost the same x, so pitch decides whether their labels touch.
  const rowPitch = compact ? 40 : 42;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="metric-preset" className="text-[13px] font-medium text-slate">
            Metric
          </label>
          <select
            id="metric-preset"
            className="h-9 w-80"
            value={preset?.id}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {preset?.cityChoice && (
          <div className="flex flex-col gap-1">
            <label htmlFor="city-choice" className="text-[13px] font-medium text-slate">
              City
            </label>
            <select
              id="city-choice"
              className="h-9 w-52"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {CITY_CHOICES.map((c) => (
                <option key={c} value={c}>
                  {reg.cityName(c)}
                </option>
              ))}
            </select>
          </div>
        )}
        {preset?.toggleCentres && (
          <label className="flex items-center gap-2 text-sm text-ink font-normal pb-2">
            <input
              type="checkbox"
              checked={showCentres}
              onChange={(e) => setShowCentres(e.target.checked)}
            />
            also show centres (locations)
          </label>
        )}
      </div>

      {preset && <p className="text-sm text-muted -mt-2">{preset.intro}</p>}

      {headline && (
        <p className="serif text-[19px] sm:text-[22px] leading-snug">
          {headline.count} sources · {inrNum(headline.min)} to {inrNum(headline.max)} · spread{" "}
          {headline.spread}%
        </p>
      )}

      {bars.length === 0 ? (
        tableFacts.length > 0 ? (
          <Card className="py-4 text-sm text-muted">
            No numeric figures for this metric — every fact here is published as words, so the table
            below lists them all.
          </Card>
        ) : (
          <EmptyState>No facts for this metric yet. Add a source.</EmptyState>
        )
      ) : (
        <Card className="py-4">
          <div ref={chartRef} style={{ height: bars.length * rowPitch + 48 }} className="overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={bars}
                margin={chartMargin}
                barCategoryGap="22%"
              >
                <CartesianGrid horizontal={false} stroke="#E9ECEF" />
                <XAxis
                  type="number"
                  domain={[0, axisMax]}
                  tick={{ fill: "#6C757D", fontSize: 12 }}
                  stroke="#E9ECEF"
                  tickFormatter={(v: number) => inrNum(v)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={axisWidth}
                  tick={{ fill: "#6C757D", fontSize: 12 }}
                  stroke="#E9ECEF"
                  tickFormatter={(v: string) =>
                    compact && v.length > 26 ? `${v.slice(0, 25).trimEnd()}…` : v
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(48,67,89,0.05)" }}
                  contentStyle={{
                    border: "1px solid #304359",
                    borderRadius: 4,
                    fontSize: 12,
                    boxShadow: "none",
                  }}
                  formatter={(v: number) => [inrNum(v), "published figure"]}
                  labelFormatter={(label: string) => label}
                />
                <Bar
                  dataKey="value_num"
                  barSize={14}
                  isAnimationActive={false}
                  shape={(props: unknown) => (
                    <BarShape {...(props as BarShapeProps)} domainMax={domainMax} />
                  )}
                >
                  {bars.map((b) => (
                    <Cell key={b.key} fill={b.shade === "primary" ? "#304359" : "#778DA9"} />
                  ))}
                  <LabelList
                    dataKey={compact ? "shortLabel" : "valueLabel"}
                    content={(props: unknown) => (
                      <ValueLabel {...(props as ValueLabelProps)} bars={bars} />
                    )}
                  />
                </Bar>
              </BarChart>
              </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted mt-2">
            {bars.some((b) => b.shade === "secondary")
              ? "Companies in ink, centres/locations in light slate. Ranges are drawn as a bar to the published midpoint with a line to the top of the range."
              : "Ranges are drawn as a bar to the published midpoint with a line to the top of the range."}{" "}
            {preset?.oneBarPerCity
              ? "Bars use one methodology (India Office Market Annual Update 2025); the table below lists every published figure for the city."
              : ""}
          </p>
        </Card>
      )}

      <WhyNote key={tableFacts.map((f) => f.id).join(",")} factIds={tableFacts.map((f) => f.id)} />

      <Card title="Every published figure" className="mt-1">
        {tableFacts.length === 0 ? (
          <EmptyState>No facts for this metric yet. Add a source.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>Value</Th>
                <Th>As of</Th>
                <Th>Definition</Th>
                <Th>Confidence</Th>
                <Th>Flags</Th>
              </tr>
            </thead>
            <tbody>
              {tableFacts.map((f) => {
                const src = reg.source(f.source_id);
                return (
                  <Tr key={f.id}>
                    <Td>
                      {src ? (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate underline"
                        >
                          {sourceLabel(src, f.source_id)}
                        </a>
                      ) : (
                        f.source_id
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{factValue(f)}</Td>
                    <Td className="whitespace-nowrap">{f.as_of}</Td>
                    <DefinitionCell note={f.definition_note} />
                    <Td>
                      <ConfidenceBadge level={f.confidence} />
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        {f.unverified && <UnverifiedBadge />}
                        {src?.url_precision === "domain_only" && <SiteLinkFlag />}
                        {!f.unverified && src?.url_precision !== "domain_only" && (
                          <span className="text-muted">—</span>
                        )}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

interface ValueLabelProps {
  /** the bar's own rect, as recharts resolved it */
  viewBox?: { x: number; y: number; width: number; height: number };
  value?: string;
  /** position of this bar in the chart's data, used to find its range */
  index?: number;
  bars: BarDatum[];
}

/**
 * Draws the value label past the end of the published figure.
 *
 * A point estimate ends at the bar, but a range keeps a whisker running from the
 * midpoint to the top of the range, so the label starts past the whisker. Without
 * that, the line runs straight through the "1,800-1,900" text. The x used here is
 * the bar's own pixel width scaled by rangeMax/value_num, which is exactly where
 * BarShape puts the whisker's end, so the two can never disagree.
 */
function ValueLabel({ viewBox, value, index = 0, bars }: ValueLabelProps) {
  const text = value == null ? "" : String(value);
  const bar = bars[index];
  if (!viewBox || !text || !bar) return null;
  const barEnd = viewBox.x + viewBox.width;
  const pastWhisker =
    bar.rangeMax !== null && bar.value_num > 0
      ? viewBox.x + (viewBox.width * bar.rangeMax) / bar.value_num
      : barEnd;
  return (
    <text
      x={pastWhisker + 8}
      y={viewBox.y + viewBox.height / 2}
      dy="0.35em"
      fill="#304359"
      fontSize={12}
    >
      {text}
    </text>
  );
}

/**
 * How a source is named in the table and the chart.
 *
 * Almost always the publisher, but the assignment brief is a client document
 * rather than a market source: showing it as "Flexiple" next to nasscom and EY
 * reads as a peer estimate, which it isn't.
 */
function sourceLabel(src: { id: string; publisher: string } | undefined, fallbackId: string): string {
  if (!src) return fallbackId;
  if (src.id === "src_flexiple_brief") return "Flexiple brief";
  return src.publisher;
}

/**
 * The definition column is the noisiest cell in the table — a methodology note
 * per row — so it starts closed and opens in place. Every fact still keeps its
 * definition available, just not competing with the values.
 */
function DefinitionCell({ note }: { note: string | null }) {
  if (!note) {
    return (
      <Td className="text-muted align-top">
        <span className="text-muted">—</span>
      </Td>
    );
  }
  return (
    <Td className="align-top">
      <details className="text-[13px]">
        <summary className="cursor-pointer text-slate underline decoration-dotted select-none">
          show
        </summary>
        <span className="mt-1 block text-muted">{note}</span>
      </details>
    </Td>
  );
}

/** Top of a published range ("1,800-1,900" → 1900), for the range line. */
/** Round an axis maximum up to a friendly value so bars don't end on the plot edge. */
function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / mag; // 1..10
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}
/**
 * A range published as text ("1,800-1,900") carries its unit in the unit field, so
 * it was the only bar on the chart reading as a bare number while every other bar
 * ended in "GCCs". This gives the text-published ones the same treatment.
 */
function withUnit(text: string, unit: string | null): string {
  if (!unit) return text;
  return text.toLowerCase().includes(unit.toLowerCase()) ? text : `${text} ${unit}`;
}

function rangeMaxOf(f: Fact): number | null {
  if (!f.value_text) return null;
  const nums = f.value_text.match(/\d[\d,]*(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const max = Math.max(...nums.map((n) => Number(n.replace(/,/g, ""))));
  return Number.isFinite(max) ? max : null;
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: BarDatum;
  domainMax: number;
}

function BarShape({ x = 0, y = 0, width = 0, height = 0, payload, domainMax }: BarShapeProps) {
  const value = payload?.value_num ?? 0;
  const max = payload?.rangeMax ?? value;
  const cy = y + height / 2;
  const fill = payload?.shade === "primary" ? "#304359" : "#778DA9";
  if (!(value > 0)) return <rect x={x} y={y} width={width} height={height} fill={fill} />;
  const endX = x + (width * max) / value;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} />
      {payload?.rangeMax !== null && payload?.rangeMax !== undefined && (
        <g>
          <line x1={x + width} y1={cy} x2={endX} y2={cy} stroke="#304359" strokeWidth={2} />
          <line x1={endX} y1={cy - 5} x2={endX} y2={cy + 5} stroke="#304359" strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

/** The model service answered 429: busy, not broken. */
class BusyError extends Error {}

function WhyNote({ factIds }: { factIds: string[] }) {
  const [state, setState] = useState<"loading" | "done" | "error" | "busy">("loading");
  const [note, setNote] = useState<{ note: string; cited_ids: string[] } | null>(null);
  const [aiOff, setAiOff] = useState(false);

  const load = () => {
    setState("loading");
    fetch("/api/why", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factIds }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status === 429 ? new BusyError() : new Error("failed"))))
      .then((d) => {
        if (d.aiOff) {
          setAiOff(true);
          setState("done");
          return;
        }
        setAiOff(false);
        setNote(d);
        setState("done");
      })
      .catch((e: unknown) => {
        // the note box is the one place a reader has no other cue, so a busy
        // model has to say so here rather than reading as a failed feature
        setState(e instanceof BusyError ? "busy" : "error");
      });
  };

  useEffect(load, [factIds.join(",")]);

  return (
    <Card title="Why they differ">
      {state === "loading" && <SkeletonRows rows={2} cols={1} />}
      {state === "error" && (
        <p className="text-sm text-muted">
          Couldn&apos;t write the note. The table above is the full data.{" "}
          <button className="text-slate underline" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {state === "busy" && (
        <p className="text-sm text-muted">
          The note is waiting on the model, which is busy right now. The table above is the full
          data.{" "}
          <button className="text-slate underline" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {state === "done" && aiOff && (
        <p className="text-sm text-muted">AI is off in this deployment, so there is no note. The table above is the full data.</p>
      )}
      {state === "done" && note && (
        <>
          <p className="text-sm">
            {note.cited_ids.length === 0 ? "Only one source; nothing to reconcile." : renderInline(note.note)}
          </p>
          <p className="text-xs text-muted mt-1">
            Written from the dates and definitions above, not from outside sources.{" "}
            <button className="text-slate underline" onClick={load}>
              Regenerate
            </button>
          </p>
        </>
      )}
    </Card>
  );
}








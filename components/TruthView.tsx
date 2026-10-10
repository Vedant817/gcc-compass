"use client";

import { useEffect, useMemo, useState } from "react";
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
import { CitationChip } from "@/components/CitationChip";
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
  tableFilters?: { metric?: string; entity?: string };
  defaultCity?: string;
  cityChoice?: boolean;
  toggleCentres?: boolean;
  /** every entity with the metric, not just India (used by the /truth?metric= deep link) */
  allEntities?: boolean;
  headlineOver?: string[]; // fact ids the headline is computed over (defaults to bars)
}

const CITY_CHOICES = ["bengaluru", "hyderabad", "pune", "chennai"];

interface BarDatum {
  key: string;
  label: string;
  value_num: number;
  valueLabel: string;
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
          label: `${src?.publisher ?? f.source_id} · ${f.as_of}`,
          value_num: f.value_num,
          valueLabel: factValue(f),
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
        <p className="serif text-[22px]">
          {headline.count} sources · {inrNum(headline.min)} to {inrNum(headline.max)} · spread{" "}
          {headline.spread}%
        </p>
      )}

      {bars.length === 0 ? (
        <EmptyState>No facts for this metric yet. Add a source.</EmptyState>
      ) : (
        <Card className="py-4">
          <div style={{ height: bars.length * 30 + 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={bars}
                margin={{ top: 4, right: 132, bottom: 24, left: 8 }}
                barCategoryGap="22%"
              >
                <CartesianGrid horizontal={false} stroke="#E9ECEF" />
                <XAxis
                  type="number"
                  domain={[0, domainMax]}
                  tick={{ fill: "#6C757D", fontSize: 12 }}
                  stroke="#E9ECEF"
                  tickFormatter={(v: number) => inrNum(v)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={250}
                  tick={{ fill: "#6C757D", fontSize: 12 }}
                  stroke="#E9ECEF"
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
                    dataKey="valueLabel"
                    position="right"
                    fill="#304359"
                    fontSize={12}
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
                          {src.publisher}
                        </a>
                      ) : (
                        f.source_id
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">{factValue(f)}</Td>
                    <Td className="whitespace-nowrap">{f.as_of}</Td>
                    <Td className="text-muted">{f.definition_note ?? "—"}</Td>
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

/** Top of a published range ("1,800-1,900" → 1900), for the range line. */
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
  const endX = x + (width * max) / value;
  const cy = y + height / 2;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={payload?.shade === "primary" ? "#304359" : "#778DA9"} />
      {payload?.rangeMax !== null && payload?.rangeMax !== undefined && (
        <g>
          <line x1={x + width} y1={cy} x2={endX} y2={cy} stroke="#304359" strokeWidth={2} />
          <line x1={endX} y1={cy - 5} x2={endX} y2={cy + 5} stroke="#304359" strokeWidth={2} />
        </g>
      )}
    </g>
  );
}

function WhyNote({ factIds }: { factIds: string[] }) {
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [note, setNote] = useState<{ note: string; cited_ids: string[] } | null>(null);
  const [aiOff, setAiOff] = useState(false);

  const load = () => {
    setState("loading");
    fetch("/api/why", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factIds }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
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
      .catch(() => setState("error"));
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
      {state === "done" && aiOff && (
        <p className="text-sm text-muted">AI is off in this deployment, so there is no note. The table above is the full data.</p>
      )}
      {state === "done" && note && (
        <>
          <p className="text-sm">
            {note.cited_ids.length === 0 ? "Only one source; nothing to reconcile." : renderWithChips(note.note)}
          </p>
          <p className="text-xs text-muted mt-1">
            Written by the model from the definition, date and source type fields only.{" "}
            <button className="text-slate underline" onClick={load}>
              Regenerate
            </button>
          </p>
        </>
      )}
    </Card>
  );
}

export function renderWithChips(text: string) {
  return renderInline(text);
}



"use client";

import { useMemo, useState } from "react";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ExtractionReview, RecentlyAdded, type ApprovedFactInput } from "@/components/add-source/ExtractionReview";
import { TELANGANA_SAMPLE } from "@/components/add-source/addSourceShared";
import { registry } from "@/lib/registry";
import { readOverlay, writeOverlay, nextFactId, nextSourceId } from "@/lib/overlay";
import { factValue } from "@/lib/format";
import type { Fact, Source } from "@/lib/types";

type Meta = {
  title: string;
  publisher: string;
  url: string;
  published_date: string;
  type: Source["type"];
  /** site-level when the URL is a publisher's site, not the exact page */
  url_precision?: Source["url_precision"];
};

const EMPTY_META: Meta = {
  title: "",
  publisher: "",
  url: "",
  published_date: "",
  type: "news",
};

interface Row {
  entity_type: "country" | "city" | "state" | "provider";
  entity_id: string | null;
  entity_name: string | null;
  metric: string;
  new_metric: boolean;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  as_of: string | null;
  definition_note: string | null;
  quote: string;
  suggested_confidence: "H" | "M" | "L";
  quote_found: boolean;
  value_in_quote: boolean;
  as_of_defaulted?: boolean;
}

export default function AddSourceView() {
  const [meta, setMeta] = useState<Meta>(EMPTY_META);
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [aiOff, setAiOff] = useState(false);
  const [cachedResult, setCachedResult] = useState(false);
  const [recentKey, setRecentKey] = useState(0);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const toast = useToast();

  const patchMeta = (p: Partial<Meta>) => setMeta((m) => ({ ...m, ...p }));

  const loadSample = () => {
    setMeta(TELANGANA_SAMPLE.meta);
    // the sample text on its own; the "paraphrased" caption belongs to the UI,
    // not to the text that gets sent for extraction
    setText(TELANGANA_SAMPLE.text);
    setError(null);
    // Clicking the sample while its rows are already on screen must not wipe them:
    // loading the same sample twice is a no-op for the review, and re-extracting
    // only happens if the reader asks for it.
    setSampleLoaded(true);
  };

  const extract = async () => {
    setError(null);
    setAiOff(false);
    setCachedResult(false);
    setExtracting(true);
    setRows(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          url: meta.url.trim() || undefined,
          meta: {
            title: meta.title.trim(),
            publisher: meta.publisher.trim(),
            url: meta.url.trim() || undefined,
            published_date: meta.published_date.trim() || undefined,
            type: meta.type,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Extraction failed.");
        return;
      }
      if (data.aiOff) {
        setAiOff(true);
        return;
      }
      setCachedResult(Boolean(data.cached));
      setRows(
        (data.facts ?? []).map((f: Row) => ({
          ...f,
          as_of: f.as_of ?? (meta.published_date.trim() || null),
          as_of_defaulted: !f.as_of && Boolean(meta.published_date.trim()),
        })),
      );
      setWarnings(data.warnings ?? []);
      if ((data.facts ?? []).length === 0) setError("The model found no facts it could quote exactly. Try a denser passage.");
    } catch {
      setError("Extraction failed. Try again.");
    } finally {
      setExtracting(false);
    }
  };

  const approve = (row: ApprovedFactInput) => {
    const overlay = readOverlay();
    // reuse a seeded source when the URL matches, else create one
    let sourceId = overlay.sources.find((s) => s.url && s.url === meta.url.trim())?.id
      ?? registry.sources.find((s) => s.url && s.url === meta.url.trim())?.id;
    let newSources = overlay.sources;
    if (!sourceId) {
      const url = meta.url.trim();
      sourceId = nextSourceId([...registry.sources, ...overlay.sources]);
      const reliability: Source["reliability"] =
        meta.type === "official_policy" ? "H" : meta.type === "vendor_blog" ? "L" : "M";
      const source: Source = {
        id: sourceId,
        title: meta.title.trim() || "Untitled source",
        publisher: meta.publisher.trim() || "Unknown publisher",
        url: url || "",
        published_date: meta.published_date.trim() || null,
        type: meta.type,
        reliability,
        url_precision: meta.url_precision ?? (url ? "exact" : "domain_only"),
        notes: url ? "" : "No link recorded for this source.",
      };
      newSources = [...overlay.sources, source];
      toast(`Source ${source.id} added to the registry`);
    }
    const factId = nextFactId([...registry.facts, ...overlay.facts]);
    const fact: Fact = {
      id: factId,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metric: row.metric,
      value_num: row.value_num,
      value_text: row.value_text,
      unit: row.unit,
      as_of: row.as_of ?? "not stated",
      definition_note: row.definition_note,
      source_id: sourceId,
      confidence: row.suggested_confidence,
      verified_by_human: true,
      extracted_by: "ai",
      unverified: false,
      quote: row.quote,
    };
    writeOverlay({ sources: newSources, facts: [...overlay.facts, fact] });
    setRecentKey((k) => k + 1);
    toast(`${factId} added to the registry`, {
      href: `/truth?metric=${encodeURIComponent(fact.metric)}`,
      label: "See it in the Truth table",
    });
  };

  const recent = useMemo(() => {
    void recentKey;
    const overlay = readOverlay();
    return overlay.facts.map((f) => {
      const src = overlay.sources.find((s) => s.id === f.source_id) ?? registry.source(f.source_id);
      return {
        id: f.id,
        metric: f.metric,
        entity_id: f.entity_id,
        value: factValue(f),
        as_of: f.as_of,
        source: src ? `${src.publisher}${src.url_precision === "domain_only" ? " (site-level link)" : ""}` : f.source_id,
      };
    });
  }, [recentKey]);

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
      <div className="flex flex-col gap-4">
        <Card title="Source">
          <div className="flex flex-col gap-3">
            <Field label="Title" htmlFor="src-title">
              <TextInput id="src-title" value={meta.title} onChange={(e) => patchMeta({ title: e.target.value })} />
            </Field>
            <Field label="Publisher" htmlFor="src-pub">
              <TextInput id="src-pub" value={meta.publisher} onChange={(e) => patchMeta({ publisher: e.target.value })} />
            </Field>
            <Field label="URL (optional)" htmlFor="src-url" hint="With a URL and no text, the server fetches the page.">
              <TextInput id="src-url" value={meta.url} onChange={(e) => patchMeta({ url: e.target.value })} placeholder="https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Published date" htmlFor="src-date" hint="YYYY, YYYY-MM or YYYY-MM-DD">
                <TextInput id="src-date" value={meta.published_date} onChange={(e) => patchMeta({ published_date: e.target.value })} />
              </Field>
              <Field label="Type" htmlFor="src-type">
                <Select id="src-type" value={meta.type} onChange={(e) => patchMeta({ type: e.target.value as Source["type"] })}>
                  <option value="news">News</option>
                  <option value="official_policy">Official policy</option>
                  <option value="industry_report">Industry report</option>
                  <option value="broker_report">Broker report</option>
                  <option value="vendor_blog">Vendor blog</option>
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card title="Text">
          <Field label="Paste the text" htmlFor="src-text" hint="Up to 20,000 characters.">
            <TextArea
              id="src-text"
              className="min-h-[220px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the article or policy text the facts come from."
            />
          </Field>
          <div className="flex items-center gap-3 mt-3">
            <Button onClick={extract} disabled={extracting || (!text.trim() && !meta.url.trim())}>
              {extracting ? "Extracting…" : "Extract facts"}
            </Button>
            <button type="button" className="text-sm text-slate underline" onClick={loadSample}>
              Load Telangana sample
            </button>
          </div>
          {sampleLoaded && (
            <p className="text-xs text-muted mt-2">Sample text (paraphrased for demo).</p>
          )}
          {error && (
            <p className="text-sm text-status-noteligible mt-2" role="alert">
              {error}
            </p>
          )}
          {aiOff && <p className="text-sm text-muted mt-2">AI is off in this deployment.</p>}
        </Card>
      </div>

      <div>
        {rows ? (
          // The heading stays once rows arrive. It used to swap out for the rows
          // themselves, so the moment extraction succeeded the page lost the one
          // label that told you what you were looking at.
          <Card title="Review">
            <div className="flex flex-col gap-3">
              {cachedResult && (
                <p className="text-sm border border-rule bg-paper text-slate rounded px-3 py-2">
                  <span className="font-mono text-[11px] border border-rule bg-white px-1.5 py-0.5 mr-2">
                    cached result
                  </span>
                  The model couldn&apos;t extract this time, so these are the pre-validated facts
                  for the built-in Telangana sample. Review them as usual — nothing enters the
                  registry without your Approve.
                </p>
              )}
              <ExtractionReview
                facts={rows}
                warnings={warnings}
                pastedText={text}
                onApprove={approve}
              />
            </div>
          </Card>
        ) : (
          <Card title="Review">
            <p className="text-sm text-muted">
              The model proposes candidate facts with the exact quote each one came from. Nothing
              enters the registry until you click Approve on a row; rows whose quote isn&apos;t in the
              pasted text are flagged and can&apos;t be approved until the quote is fixed.
            </p>
          </Card>
        )}
        <RecentlyAdded facts={recent} />
      </div>
    </div>
  );
}


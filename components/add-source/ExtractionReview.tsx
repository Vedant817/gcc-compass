"use client";

import { useMemo, useState } from "react";
import { Card, Table, Td, Th, Tr } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge, ConfidenceBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Field, Select, TextArea, TextInput } from "@/components/ui/field";
import { CitationChip } from "@/components/CitationChip";
import type { ExtractedT } from "@/lib/types";
import { factValue } from "@/lib/format";
import { ALLOWED_ENTITY_IDS } from "./addSourceShared";

export interface ApprovedFactInput {
  entity_type: "country" | "city" | "state" | "provider";
  entity_id: string;
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
}

type Row = Omit<
  ExtractedT["facts"][number],
  "entity_id" | "entity_name" | "value_num" | "value_text" | "unit" | "as_of" | "definition_note"
> & {
  entity_id: string | null;
  entity_name: string | null;
  value_num: number | null;
  value_text: string | null;
  unit: string | null;
  as_of: string | null;
  definition_note: string | null;
  quote_found: boolean;
  value_in_quote: boolean;
  as_of_defaulted?: boolean;
};

export function ExtractionReview({
  facts,
  warnings,
  pastedText,
  onApprove,
}: {
  facts: Row[];
  warnings: string[];
  pastedText: string;
  onApprove: (f: ApprovedFactInput) => void;
}) {
  const [rejected, setRejected] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<Record<number, Partial<Row>>>({});
  const toast = useToast();

  const rows = facts
    .map((f, i) => ({ ...f, ...edits[i], index: i }))
    .filter((r) => !rejected.has(r.index));

  const normalised = useMemo(() => pastedText.replace(/\s+/g, " ").trim(), [pastedText]);

  return (
    <div className="flex flex-col gap-4">
      {warnings.length > 0 && (
        <ul className="text-sm text-status-needscheck border border-status-needscheck bg-status-needscheckbg rounded px-3 py-2 space-y-1">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      {rows.length === 0 && (
        <p className="text-sm text-muted">No candidate facts left. Re-run the extraction or reject fewer rows.</p>
      )}
      {rows.map((r) => {
        const quoteOk = normalised.includes(r.quote.replace(/\s+/g, " ").trim());
        const entityOk = r.entity_id !== null && ALLOWED_ENTITY_IDS.has(r.entity_id);
        const digitsOk =
          r.value_num === null ||
          (String(r.value_num).replace(/,/g, "") !== "" &&
            r.quote.replace(/,/g, "").includes(String(r.value_num).replace(/,/g, "")));
        const canApprove = quoteOk && entityOk && digitsOk && r.as_of !== null;
        return (
          <Card key={r.index} className="p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[11px] border border-rule bg-white px-1.5 py-0.5">
                {r.entity_type}:{r.entity_id ?? r.entity_name ?? "?"}
              </span>
              <span className="font-mono text-[11px] text-slate">{r.metric}</span>
              {r.new_metric && <Badge>new metric</Badge>}
              <ConfidenceBadge level={r.suggested_confidence} />
              <span className="ml-auto flex gap-2">
                <Button
                  variant="primary"
                  disabled={!canApprove}
                  onClick={() => {
                    onApprove({
                      entity_type: r.entity_type,
                      entity_id: r.entity_id as string,
                      entity_name: r.entity_name,
                      metric: r.metric,
                      new_metric: r.new_metric,
                      value_num: r.value_num,
                      value_text: r.value_text,
                      unit: r.unit,
                      as_of: r.as_of,
                      definition_note: r.definition_note,
                      quote: r.quote,
                      suggested_confidence: r.suggested_confidence,
                    });
                    setRejected((s) => new Set(s).add(r.index));
                    toast("Fact added to the registry");
                  }}
                >
                  Approve
                </Button>
                <Button variant="secondary" onClick={() => setRejected((s) => new Set(s).add(r.index))}>
                  Reject
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setEdits((e) => ({ ...e, [r.index]: e[r.index] ? {} : { ...r } }))
                  }
                >
                  {edits[r.index] ? "Done editing" : "Edit"}
                </Button>
              </span>
            </div>

            {edits[r.index] ? (
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Entity id (from the registry list)" htmlFor={`ent-${r.index}`}>
                  <Select
                    id={`ent-${r.index}`}
                    value={r.entity_id ?? ""}
                    onChange={(e) => setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], entity_id: e.target.value || null } }))}
                  >
                    <option value="">— not in the list —</option>
                    {[...ALLOWED_ENTITY_IDS].sort().map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Metric" htmlFor={`met-${r.index}`}>
                  <TextInput
                    id={`met-${r.index}`}
                    value={r.metric}
                    onChange={(e) => setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], metric: e.target.value } }))}
                  />
                </Field>
                <Field label="Value (number)" htmlFor={`vn-${r.index}`}>
                  <TextInput
                    id={`vn-${r.index}`}
                    value={r.value_num === null ? "" : String(r.value_num)}
                    onChange={(e) =>
                      setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], value_num: e.target.value === "" ? null : Number(e.target.value) } }))
                    }
                  />
                </Field>
                <Field label="Value (published text, if a range)" htmlFor={`vt-${r.index}`}>
                  <TextInput
                    id={`vt-${r.index}`}
                    value={r.value_text ?? ""}
                    onChange={(e) => setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], value_text: e.target.value || null } }))}
                  />
                </Field>
                <Field label="Unit" htmlFor={`un-${r.index}`}>
                  <TextInput
                    id={`un-${r.index}`}
                    value={r.unit ?? ""}
                    onChange={(e) => setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], unit: e.target.value || null } }))}
                  />
                </Field>
                <Field label="As of" htmlFor={`ao-${r.index}`}>
                  <TextInput
                    id={`ao-${r.index}`}
                    value={r.as_of ?? ""}
                    onChange={(e) => setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], as_of: e.target.value || null } }))}
                  />
                </Field>
                <Field label="Quote (exact span from the text)" htmlFor={`q-${r.index}`} className="md:col-span-2">
                  <TextArea
                    id={`q-${r.index}`}
                    value={r.quote}
                    onChange={(e) => setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], quote: e.target.value } }))}
                  />
                </Field>
                <Field label="Confidence" htmlFor={`cf-${r.index}`}>
                  <Select
                    id={`cf-${r.index}`}
                    value={r.suggested_confidence}
                    onChange={(e) =>
                      setEdits((x) => ({ ...x, [r.index]: { ...x[r.index], suggested_confidence: e.target.value as Row["suggested_confidence"] } }))
                    }
                  >
                    <option value="H">H — official policy or primary report</option>
                    <option value="M">M — reputable news/secondary</option>
                    <option value="L">L — vendor blog or hedged</option>
                  </Select>
                </Field>
              </div>
            ) : (
              <dl className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-[13px] mb-2">
                <div>
                  <dt className="text-muted inline">Value: </dt>
                  <dd className="inline">{factValue(r)}</dd>
                </div>
                <div>
                  <dt className="text-muted inline">As of: </dt>
                  <dd className="inline">{r.as_of ?? "—"}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-muted inline">Definition: </dt>
                  <dd className="inline">{r.definition_note ?? "—"}</dd>
                </div>
                {r.as_of_defaulted && (
                  <div className="md:col-span-2">
                    <dt className="text-muted inline">As-of source: </dt>
                    <dd className="inline">
                      the source&apos;s publication date — edit if the fact is about another period
                    </dd>
                  </div>
                )}
              </dl>
            )}

            <p className="text-[13px] text-muted mb-1">Quote:</p>
            <blockquote className="text-[13px] border-l-2 border-sand pl-2 mb-2">{r.quote}</blockquote>

            <div className="flex flex-wrap gap-2">
              {!quoteOk && (
                <span className="text-xs text-status-noteligible border border-status-noteligible px-1.5 py-0.5">
                  Quote not found in text — Approve is disabled until the quote matches the pasted text.
                </span>
              )}
              {quoteOk && !digitsOk && (
                <span className="text-xs text-status-noteligible border border-status-noteligible px-1.5 py-0.5">
                  The value&apos;s digits don&apos;t appear in the quote.
                </span>
              )}
              {quoteOk && digitsOk && !entityOk && (
                <span className="text-xs text-status-noteligible border border-status-noteligible px-1.5 py-0.5">
                  Entity isn&apos;t in the registry&apos;s city/state/provider list. Map it with Edit or reject the row.
                </span>
              )}
              {canApprove && (
                <span className="text-xs text-status-eligible">Quote found verbatim in the pasted text.</span>
              )}
            </div>
          </Card>
        );
      })}

      {rows.length > 0 && (
        <Card title="Pasted text with the quote highlighted">
          <div className="text-[13px] leading-6 max-h-64 overflow-y-auto whitespace-pre-wrap">
            {highlightQuote(pastedText, rows[0].quote)}
          </div>
        </Card>
      )}
    </div>
  );
}

function highlightQuote(text: string, quote: string) {
  const norm = text.replace(/\s+/g, " ");
  const q = quote.replace(/\s+/g, " ").trim();
  const idx = norm.indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <>
      <span>{text.slice(0, idx)}</span>
      <mark>{text.slice(idx, idx + q.length)}</mark>
      <span>{text.slice(idx + q.length)}</span>
    </>
  );
}

export function RecentlyAdded({ facts }: { facts: { id: string; metric: string; entity_id: string; value: string; as_of: string; source: string }[] }) {
  if (facts.length === 0) return null;
  return (
    <Card title="Recently added" className="mt-4">
      <Table>
        <thead>
          <tr>
            <Th>Id</Th>
            <Th>Entity</Th>
            <Th>Metric</Th>
            <Th>Value</Th>
            <Th>As of</Th>
            <Th>Source</Th>
            <Th>Badge</Th>
          </tr>
        </thead>
        <tbody>
          {facts.map((f) => (
            <Tr key={f.id}>
              <Td>
                <CitationChip id={f.id} />
              </Td>
              <Td>{f.entity_id}</Td>
              <Td className="font-mono text-[11px]">{f.metric}</Td>
              <Td>{f.value}</Td>
              <Td>{f.as_of}</Td>
              <Td>{f.source}</Td>
              <Td>
                <Badge className="border-slate-light text-slate">AI-extracted · human-approved</Badge>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

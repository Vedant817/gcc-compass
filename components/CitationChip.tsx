"use client";

import { useMemo, useState } from "react";
import { RegistryView } from "@/lib/registry";
import { readOverlay } from "@/lib/overlay";
import { ConfidenceBadge, SiteLinkFlag, UnverifiedBadge } from "@/components/ui/badge";
import { factValue } from "@/lib/format";

function CitationHover({ id, reg }: { id: string; reg: RegistryView }) {
  const fact = reg.fact(id);
  const policy = reg.policy(id);
  const source = reg.source(fact?.source_id ?? policy?.source_id);
  return (
    <span className="block w-72 text-left normal-case tracking-normal font-sans">
      <span className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[11px] text-ink">{id}</span>
        {fact && <ConfidenceBadge level={fact.confidence} />}
        {fact?.unverified && <UnverifiedBadge />}
      </span>
      {fact ? (
        <>
          <span className="block text-[13px] text-ink">
            {factValue(fact)} — {fact.metric} for {fact.entity_id}
          </span>
          <span className="block text-xs text-muted">as of {fact.as_of}</span>
          {fact.definition_note && (
            <span className="block text-xs text-muted italic">{fact.definition_note}</span>
          )}
        </>
      ) : policy ? (
        <>
          <span className="block text-[13px] text-ink">{policy.name}</span>
          {policy.summary && <span className="block text-xs text-muted">{policy.summary}</span>}
        </>
      ) : (
        <span className="block text-[13px] text-muted">Not in the registry.</span>
      )}
      {source && (
        <span className="mt-1 flex flex-wrap items-center gap-2">
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate underline"
          >
            {source.publisher}
          </a>
          {source.url_precision === "domain_only" && <SiteLinkFlag />}
        </span>
      )}
    </span>
  );
}

/** Citation chip: [f402]. Hover or focus shows the sourced fact; click opens the source. */
export function CitationChip({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const reg = useMemo(() => RegistryView.load(readOverlay()), []);
  const fact = reg.fact(id);
  const policy = reg.policy(id);
  const url = reg.source(fact?.source_id ?? policy?.source_id)?.url;
  const exists = Boolean(fact || policy);
  return (
    <span className="relative inline-block">
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`font-mono text-[11px] px-1 py-0.5 border border-rule bg-white text-ink no-underline ${
          exists ? "hover:border-slate-light" : "opacity-60"
        }`}
      >
        [{id}]
      </a>
      {open && (
        <span className="absolute z-40 bottom-full left-0 mb-1 border border-ink bg-white p-2 shadow-[0_1px_0_#E9ECEF]">
          <CitationHover id={id} reg={reg} />
        </span>
      )}
    </span>
  );
}


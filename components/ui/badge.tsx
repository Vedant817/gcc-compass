import { cn } from "@/lib/cn";
import type { ConfidenceT } from "@/lib/types";

/** Confidence badge: H ink outline, M slate outline, L muted dashed + "Low". */
export function ConfidenceBadge({ level }: { level: ConfidenceT }) {
  const map: Record<ConfidenceT, { cls: string; text: string; title: string }> = {
    H: { cls: "border-ink text-ink", text: "High", title: "Official policy or primary report" },
    M: { cls: "border-slate text-slate", text: "Medium", title: "Reputable secondary source" },
    L: {
      cls: "border-dashed border-muted text-muted",
      text: "Low",
      title: "Single vendor source or hedged wording",
    },
  };
  const b = map[level];
  return (
    <span
      title={b.title}
      className={cn(
        "inline-block px-1.5 py-0.5 text-[11px] leading-4 border rounded bg-white whitespace-nowrap",
        b.cls,
      )}
    >
      {b.text}
    </span>
  );
}

export function UnverifiedBadge() {
  return (
    <span
      title="Marked [UNVERIFIED] in the registry: confidence is Low until a primary source confirms it."
      className="inline-block px-1.5 py-0.5 text-[11px] leading-4 border border-dashed border-status-noteligible text-status-noteligible bg-white whitespace-nowrap"
    >
      [UNVERIFIED]
    </span>
  );
}

export function SiteLinkFlag() {
  return (
    <span
      title="Research recorded the site, not the exact page. The link opens the publisher's site."
      className="inline-block px-1.5 py-0.5 text-[11px] leading-4 border border-rule text-muted bg-white whitespace-nowrap"
    >
      site-level link
    </span>
  );
}

export function AiExtractedBadge() {
  return (
    <span className="inline-block px-1.5 py-0.5 text-[11px] leading-4 border border-slate-light text-slate bg-white whitespace-nowrap">
      AI-extracted · human-approved
    </span>
  );
}

export function OurServiceBadge() {
  return (
    <span className="inline-block px-1.5 py-0.5 text-[11px] leading-4 border border-ink bg-sand text-ink whitespace-nowrap">
      Our service
    </span>
  );
}

const STATUS_STYLES = {
  eligible: "border-status-eligible text-status-eligible",
  not_eligible: "border-status-noteligible text-status-noteligible",
  needs_check: "border-status-needscheck text-status-needscheck bg-status-needscheckbg",
} as const;

const STATUS_TEXT = {
  eligible: "Eligible",
  not_eligible: "Not eligible",
  needs_check: "Needs check",
} as const;

export function StatusPill({
  status,
  className,
}: {
  status: keyof typeof STATUS_STYLES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block px-2 py-0.5 text-[11px] leading-4 border rounded bg-white whitespace-nowrap font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_TEXT[status]}
    </span>
  );
}

export function Badge({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-block px-1.5 py-0.5 text-[11px] leading-4 border border-rule text-muted bg-white whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

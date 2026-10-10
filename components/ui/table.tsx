import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-[13px] leading-5", className)}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  numeric,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-rule text-left font-medium text-muted px-2 py-1.5 whitespace-nowrap",
        numeric && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("border-b border-rule px-2 py-1.5 align-top", numeric && "text-right tabular-nums", className)}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onClick,
  selected,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "even:bg-paper",
        onClick && "cursor-pointer",
        selected && "bg-sand/40",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function SkeletonRows({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 py-2 border-b border-rule">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-rule rounded" style={{ width: `${100 / cols - 2}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-rule rounded bg-white p-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Card({
  children,
  className,
  title,
  aside,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className={cn("border border-rule rounded bg-white p-4", className)}>
      {(title || aside) && (
        <div className="flex items-baseline justify-between gap-3 mb-2">
          {title && <h3 className="text-[18px]">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Disclosure({
  summary,
  children,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("border border-rule rounded bg-white", className)}>
      <summary className="cursor-pointer px-3 py-2 text-sm text-slate select-none">{summary}</summary>
      <div className="px-3 pb-3 pt-1 text-sm border-t border-rule">{children}</div>
    </details>
  );
}

import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-ink text-white border-ink hover:bg-slate",
  secondary: "bg-white text-ink border-rule hover:border-slate-light",
  ghost: "bg-transparent text-slate border-transparent underline hover:text-ink",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm border rounded transition-colors",
        styles[variant],
        className,
      )}
    >
      {children}
    </a>
  );
}

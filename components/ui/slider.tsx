"use client";

import { cn } from "@/lib/cn";

/** Plain range slider: track rule, range slate, thumb ink (design guide). */
export function Slider({
  id,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("w-full h-1.5 bg-rule rounded appearance-none cursor-pointer", className)}
      style={{
        accentColor: "#415977",
      }}
    />
  );
}

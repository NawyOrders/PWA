"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/format";

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  className,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-row-reverse items-center gap-1 rounded-full border border-line bg-white p-1",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="تقليل الكمية"
        className={cn(
          "grid place-items-center rounded-full text-ink-soft transition hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:opacity-40",
          size === "sm" ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className={cn("text-center font-bold", size === "sm" ? "min-w-5 text-xs" : "min-w-6 text-sm")}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="زيادة الكمية"
        className={cn(
          "grid place-items-center rounded-full bg-brand text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40",
          size === "sm" ? "h-7 w-7" : "h-8 w-8",
        )}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

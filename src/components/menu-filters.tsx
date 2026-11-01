"use client";

import { useApp } from "@/components/providers";

export function MenuFilters({
  filters,
  value,
  onChange,
  className = "",
}: {
  filters: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useApp();
  return (
    <div className={`hide-scrollbar flex items-center gap-2 overflow-x-auto ${className}`}>
      {filters.map((filter) => {
        const active = filter === value;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter)}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
              active
                ? "bg-brand text-white shadow-[0_10px_20px_-14px_rgba(232,69,44,0.9)]"
                : "border border-line bg-white text-ink/70 hover:border-brand/30 hover:text-brand"
            }`}
          >
            {t(filter)}
          </button>
        );
      })}
    </div>
  );
}

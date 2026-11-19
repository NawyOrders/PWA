"use client";

export type MenuFilterOption = { id: string; label: string };

export function MenuFilters({
  options,
  value,
  onChange,
  className = "",
}: {
  options: MenuFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`hide-scrollbar flex items-center gap-2 overflow-x-auto ${className}`}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={`motion-press h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
              active
                ? "bg-brand text-brand-contrast shadow-[0_10px_20px_-14px_color-mix(in_srgb,var(--color-brand)_90%,transparent)]"
                : "border border-line bg-white text-ink/70 hover:border-brand/30 hover:text-brand"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

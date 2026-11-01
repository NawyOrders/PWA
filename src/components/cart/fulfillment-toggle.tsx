"use client";

import { cn } from "@/lib/format";
import { useStore, type Fulfillment } from "@/lib/store";

const options: Array<{ id: Fulfillment; label: string }> = [
  { id: "pickup", label: "الاستلام" },
  { id: "delivery", label: "التوصيل" },
];

export function FulfillmentToggle({ className }: { className?: string }) {
  const { fulfillment, setFulfillment } = useStore();

  return (
    <div
      role="group"
      aria-label="طريقة استلام الطلب"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-white p-1.5 shadow-soft",
        className,
      )}
    >
      {options.map((option) => {
        const active = fulfillment === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setFulfillment(option.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-7 py-2 text-sm font-bold transition",
              active
                ? "border-brand bg-brand-soft/40 text-brand"
                : "border-transparent text-ink-soft hover:text-brand",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/format";

export type CheckoutStep = "review" | "delivery" | "payment";

const steps: Array<{ id: CheckoutStep; label: string; href: string }> = [
  { id: "review", label: "مراجعة السلة", href: "/cart" },
  { id: "delivery", label: "بيانات التوصيل", href: "/cart/delivery" },
  { id: "payment", label: "الدفع", href: "/cart/payment" },
];

export function CheckoutSteps({
  active,
  className,
}: {
  active: CheckoutStep;
  className?: string;
}) {
  const activeIndex = steps.findIndex((step) => step.id === active);

  return (
    <ol
      aria-label="خطوات إتمام الطلب"
      className={cn(
        "flex flex-wrap items-center gap-2 text-[11px] font-semibold sm:text-xs",
        className,
      )}
    >
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        const content = (
          <>
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border text-[10px] font-bold",
                current
                  ? "border-brand bg-brand text-white"
                  : done
                    ? "border-brand text-brand"
                    : "border-line text-muted",
              )}
            >
              {done ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
            </span>
            <span>{step.label}</span>
          </>
        );

        return (
          <li key={step.id} className="flex items-center gap-2">
            {done ? (
              <Link
                href={step.href}
                className="inline-flex items-center gap-1.5 text-ink-soft transition hover:text-brand"
              >
                {content}
              </Link>
            ) : (
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5",
                  current ? "text-brand" : "text-muted",
                )}
              >
                {content}
              </span>
            )}
            {index < steps.length - 1 ? (
              <ChevronLeft className="h-3.5 w-3.5 text-muted" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

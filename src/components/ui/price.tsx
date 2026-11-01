import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/format";

export function Price({
  value,
  oldValue,
  size = "md",
  className,
}: {
  value: number;
  oldValue?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-3xl",
  } as const;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-brand", className)}>
      <span className={cn("font-extrabold leading-none", sizes[size])}>
        {formatNumber(value)}
      </span>
      <span className="text-[11px] font-bold leading-none">جنيه</span>
      {oldValue ? (
        <span className="text-[11px] font-medium text-muted line-through">
          {formatNumber(oldValue)}
        </span>
      ) : null}
    </div>
  );
}

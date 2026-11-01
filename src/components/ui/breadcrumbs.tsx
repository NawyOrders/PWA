import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/format";

export function Breadcrumbs({
  items,
  className,
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="مسار التنقل" className={cn("flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted", className)}>
      <Link href="/" className="transition hover:text-brand">
        الرئيسية
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          {item.href ? (
            <Link href={item.href} className="transition hover:text-brand">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-soft">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

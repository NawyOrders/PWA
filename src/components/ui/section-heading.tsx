import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function SectionHeading({
  title,
  icon,
  href,
  actionLabel,
  className,
}: {
  title: string;
  icon?: ReactNode;
  href?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-2.5">
        <h2 className="text-xl font-extrabold sm:text-2xl">{title}</h2>
        {icon ? <span className="text-brand">{icon}</span> : null}
      </div>
      {href && actionLabel ? (
        <Link
          href={href}
          className="hidden items-center gap-1 text-sm font-bold text-brand transition hover:text-brand-strong sm:inline-flex"
        >
          {actionLabel}
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

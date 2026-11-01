import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export function CartToolbar({
  crumbs,
  backHref = "/",
  backLabel = "متابعة التسوق",
}: {
  crumbs: Array<{ label: string; href?: string }>;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="hidden items-center justify-between gap-4 lg:flex">
      <Breadcrumbs items={[{ label: "السلة", href: "/cart" }, ...crumbs]} />
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-strong"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {backLabel}
      </Link>
    </div>
  );
}

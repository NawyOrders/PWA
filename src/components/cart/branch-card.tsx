"use client";

import Link from "next/link";
import { Clock, MapPin, Pencil } from "lucide-react";
import { branches } from "@/lib/data";
import { useStore } from "@/lib/store";

export function BranchCard({ className }: { className?: string }) {
  const { fulfillment, branchId } = useStore();
  const branch = branches.find((item) => item.id === branchId) ?? branches[0];
  const pickup = fulfillment === "pickup";

  return (
    <div className={className}>
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-soft text-brand">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-extrabold">{pickup ? "الفرع المختار" : "التوصيل إلى"}</p>
              <p className="mt-1 text-sm font-bold text-ink-soft">
                {pickup ? branch.name : "زهراء المعادي، المعراج العلوي"}
              </p>
              {pickup ? (
                <p className="mt-0.5 text-[11px] leading-5 text-muted">{branch.address}</p>
              ) : null}
            </div>
          </div>
          <Link
            href="/cart/branch"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand transition hover:text-brand-strong"
          >
            <Pencil className="h-3 w-3" aria-hidden />
            تغيير
          </Link>
        </div>
        <p className="mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[11px] text-muted">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {pickup ? `وقت الاستلام المتوقع: ${branch.hours}` : "وقت التوصيل المتوقع: 30 - 45 دقيقة"}
        </p>
      </div>
    </div>
  );
}

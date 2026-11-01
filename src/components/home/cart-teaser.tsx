"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export function CartTeaser() {
  const { count, total, lines } = useStore();

  if (count === 0) {
    return (
      <div className="card hidden items-center justify-between gap-4 p-4 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand">
            <ShoppingBag className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold">سلة الطلب فاضية</p>
            <p className="text-xs text-muted">اختار وجبتك المفضلة وابدأ الطلب</p>
          </div>
        </div>
        <Link href="/categories/burger" className="btn-brand text-sm">
          تصفح القائمة
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="card hidden items-center justify-between gap-5 p-3 lg:flex">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-brand text-lg font-extrabold text-white shadow-pop">
          {count}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">
            لديك {count} وجبات في سلة الطلب
          </p>
          <p className="truncate text-xs text-muted">
            {lines.map((line) => line.name).join(" + ")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="text-end">
          <p className="text-[11px] text-muted">إجمالي الطلب</p>
          <p className="text-lg font-extrabold text-brand">
            {formatNumber(total)} <span className="text-xs">جنيه</span>
          </p>
        </div>
        <Link href="/cart" className="btn-brand text-sm">
          متابعة الطلب والدفع
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

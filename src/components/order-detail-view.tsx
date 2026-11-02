"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { OrderTrackingView } from "@/components/order-tracking-view";
import { useApp } from "@/components/providers";

export function OrderDetailView({ orderId }: { orderId: string }) {
  const { orders, ready, t } = useApp();

  if (!ready) {
    return (
      <div className="shell min-h-[60vh] py-8" aria-hidden="true">
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="h-8 w-48 rounded-lg bg-cream" />
          <div className="h-64 rounded-3xl bg-cream" />
          <div className="h-28 rounded-3xl bg-cream" />
        </div>
      </div>
    );
  }

  const order = orders.find((item) => item.id === orderId);

  if (!order) {
    return (
      <div className="shell flex min-h-[60vh] items-center py-10">
        <div className="card mx-auto w-full max-w-xl px-6 py-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
            <PackageSearch className="size-8" strokeWidth={1.7} />
          </span>
          <h1 className="mt-5 text-xl font-extrabold">{t("الطلب غير موجود")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {t("مفيش طلب بالرقم ده، يمكن يكون اتحذف أو الرابط غلط.")}
          </p>
          <Link
            href="/orders"
            className="btn-gradient mt-6 inline-flex h-11 items-center justify-center rounded-full px-7 text-sm font-bold text-white"
          >
            {t("العودة لطلباتي")}
          </Link>
        </div>
      </div>
    );
  }

  return <OrderTrackingView order={order} />;
}

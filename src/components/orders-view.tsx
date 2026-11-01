"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, MapPin, ReceiptText, RotateCcw, Truck } from "lucide-react";
import { useApp } from "@/components/providers";
import { MobilePageHeader } from "@/components/ui";
import { formatPrice, orders, productsById, user, type Order } from "@/lib/data";

const reorderMap: Record<string, string[]> = {
  "كومبو برجر لحم": ["family-box"],
  "بيتزا بيبروني": ["pizza-pepperoni", "cola"],
  "وجبة فرايد تشيكن": ["chicken-bucket", "fries"],
};

const toArabicDigits = (value: string) =>
  value.replace(/[0-9]/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);

const trackerSteps = ["تم استلام الطلب", "قيد التحضير", "في الطريق ليك"];

export function OrdersView() {
  const { addItem, toast, t, lang } = useApp();
  const [trackedId, setTrackedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const current = orders.filter((order) => order.status === "preparing");
  const previous = orders.filter((order) => order.status === "delivered");
  const orderNumber = (id: string) => (lang === "en" ? id : toArabicDigits(id));

  const reorder = (order: Order) => {
    const items = reorderMap[order.title] ?? [];
    items.forEach((productId) => {
      const product = productsById[productId];
      if (product) addItem(productId, { price: product.price });
    });
    toast(t("تمت إضافة طلبك السابق إلى السلة"));
  };

  const renderOrder = (order: Order, index: number) => {
    const key = `${order.id}-${index}`;
    const isCurrent = order.status === "preparing";
    const tracked = trackedId === key;
    const expanded = expandedId === key;

    return (
      <article key={key} className="rounded-[26px] bg-white p-4 shadow-soft lg:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-extrabold">
            {t("طلب رقم")} {orderNumber(order.id)}
          </span>
          <span
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold ${
              isCurrent ? "bg-brand-soft text-brand" : "bg-success-soft text-success"
            }`}
          >
            {t(isCurrent ? "قيد التحضير" : "تم التوصيل")}
          </span>
        </div>

        <div className="mt-4 flex items-start gap-3.5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-peach">
            <Image src={order.image} alt={t(order.title)} fill sizes="96px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="text-[15px] font-extrabold leading-6">{t(order.title)}</h3>
            <p className="mt-1 text-[11px] leading-5 text-muted">{t(order.date)}</p>
            <p className="mt-0.5 line-2 text-[11px] leading-5 text-muted">{t(order.description)}</p>
          </div>
        </div>

        {isCurrent && order.eta ? (
          <p className="mt-3 rounded-xl bg-[#fbf4ec] px-3 py-2.5 text-center text-[11px] font-semibold text-muted">
            {t(order.eta)}
          </p>
        ) : null}

        {tracked ? (
          <div className="mt-4 rounded-2xl bg-[#fbf4ec] px-4 py-4">
            <div className="flex items-start justify-between gap-1">
              {trackerSteps.map((step, stepIndex) => {
                const done = stepIndex <= 1;
                const active = stepIndex === 2;
                return (
                  <div key={step} className="flex flex-1 flex-col items-center gap-2 text-center">
                    <span
                      className={`grid size-7 place-items-center rounded-full text-[10px] font-bold ${
                        done
                          ? "bg-success text-white"
                          : active
                            ? "border-2 border-brand bg-white text-brand"
                            : "border border-line bg-white text-muted"
                      }`}
                    >
                      {done ? "✓" : stepIndex + 1}
                    </span>
                    <span
                      className={`text-[10px] leading-4 ${
                        active ? "font-bold text-brand" : done ? "font-semibold text-ink/80" : "text-muted"
                      }`}
                    >
                      {t(step)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted">
              <MapPin className="size-3.5 text-brand" />
              {t(user.address)}
            </p>
          </div>
        ) : null}

        {expanded ? (
          <div className="mt-3 space-y-1.5 rounded-2xl bg-[#fbf4ec] px-4 py-3.5 text-[11px] leading-6 text-muted">
            <p>
              <span className="font-bold text-ink">{t("الأصناف: ")}</span>
              {t(order.description)}
            </p>
            <p>
              <span className="font-bold text-ink">{t("طريقة الدفع: ")}</span>
              {t(isCurrent ? "انستا باي" : "الدفع عند الاستلام")}
            </p>
            <p>
              <span className="font-bold text-ink">{t("العنوان: ")}</span>
              {t(user.address)}
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <div className="flex items-center gap-2">
            {isCurrent ? (
              <button
                type="button"
                onClick={() => setTrackedId(tracked ? null : key)}
                aria-expanded={tracked}
                className="flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-[11px] font-bold text-white transition hover:bg-brand-dark"
              >
                <Truck className="size-3.5" />
                {t(tracked ? "إخفاء التتبع" : "تتبع الطلب")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reorder(order)}
                className="flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-4 text-[11px] font-bold text-brand transition hover:bg-brand/15"
              >
                <RotateCcw className="size-3.5" />
                {t("اطلب تاني")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : key)}
              aria-expanded={expanded}
              className="flex h-9 items-center gap-1.5 rounded-full px-2 text-[11px] font-bold text-ink/70 transition hover:text-brand"
            >
              {t("التفاصيل")}
              <ReceiptText className="size-4" strokeWidth={1.7} />
            </button>
          </div>
          <span className="whitespace-nowrap text-base font-extrabold">
            {formatPrice(order.total)} <span className="text-xs font-bold">{t("ج.م")}</span>
          </span>
        </div>
      </article>
    );
  };

  return (
    <div className="pb-10">
      <MobilePageHeader title="سجل الطلبات" backHref="/profile" />

      <div className="shell">
        <div className="mx-auto max-w-3xl">
          <div className="hidden items-center justify-between lg:flex lg:pt-8">
            <div className="text-start">
              <h1 className="text-[32px] font-extrabold">{t("سجل الطلبات")}</h1>
              <p className="mt-2 text-sm text-muted">{t("تابع طلبك الحالي واطلب تاني أطباقك المفضلة.")}</p>
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
            >
              {t("العودة للملف الشخصي")}
              <ChevronLeft className="size-4 ltr:rotate-180" />
            </Link>
          </div>

          <div className="space-y-7 px-4 pt-2 lg:mt-7 lg:px-0">
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">{t("طلبك الحالي")}</h2>
                <span className="text-xs text-muted">
                  {current.length === 1 ? t("طلب واحد") : t("{count} طلبات", { count: current.length })}
                </span>
              </div>
              <div className="mt-3 space-y-3">{current.map(renderOrder)}</div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold">{t("الطلبات السابقة")}</h2>
                <span className="text-xs text-muted">{t("آخر {count} طلبات", { count: previous.length })}</span>
              </div>
              <div className="mt-3 space-y-3">{previous.map(renderOrder)}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

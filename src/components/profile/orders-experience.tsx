"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, MapPin, ReceiptText, Truck, X } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { orders, productsBySlug, type Order } from "@/lib/data";
import { cn, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

const trackingSteps = [
  { label: "تم استلام الطلب", icon: ReceiptText },
  { label: "قيد التحضير", icon: Clock },
  { label: "في الطريق إليك", icon: Truck },
  { label: "تم التوصيل", icon: MapPin },
];

function orderProducts(order: Order) {
  const counts = new Map<string, number>();
  order.products.forEach((slug) => {
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([slug, qty]) => ({ product: productsBySlug[slug], qty }))
    .filter((item) => Boolean(item.product));
}

function OrderCard({
  order,
  current,
  onTrack,
}: {
  order: Order;
  current?: boolean;
  onTrack?: () => void;
}) {
  const router = useRouter();
  const { addItem } = useStore();
  const [expanded, setExpanded] = useState(false);
  const items = orderProducts(order);
  const cover = items[0]?.product;

  const reorder = () => {
    items.forEach(({ product, qty }) => {
      if (product) addItem(product, { qty });
    });
    router.push("/cart");
  };

  return (
    <article className="card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold sm:text-base">
            طلب رقم {order.id}
          </h3>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[10px] font-bold sm:text-[11px]",
              order.status === "preparing"
                ? "bg-brand-soft text-brand"
                : "bg-success-soft text-success",
            )}
          >
            {order.statusLabel}
          </span>
        </div>

        <div className="mt-4 flex gap-3 sm:gap-4">
          {cover ? (
            <div className="relative h-20 w-20 flex-none overflow-hidden rounded-2xl bg-peach sm:h-24 sm:w-24">
              <Image
                src={cover.image}
                alt={cover.name}
                fill
                sizes="96px"
                className="object-cover object-center"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold sm:text-base">
              {current ? "كومبو " : ""}
              {cover?.name ?? "طلب ناوي أوردر"}
            </p>
            <p className="mt-1 text-[11px] text-muted">{order.date}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">{order.items}</p>
          </div>
        </div>

        {current && order.eta ? (
          <p className="mt-4 rounded-xl bg-cream-deep/70 px-3 py-2.5 text-center text-[11px] font-semibold text-ink-soft">
            وقت الوصول المتوقع: <span className="text-brand">{order.eta}</span>
          </p>
        ) : null}

        {expanded ? (
          <div className="mt-4 rounded-2xl border border-line bg-cream/70 p-3">
            <p className="text-[11px] font-bold">تفاصيل الطلب</p>
            <ul className="mt-2 space-y-1.5">
              {items.map(({ product, qty }) => (
                <li
                  key={product?.slug}
                  className="flex items-center justify-between gap-2 text-[11px] text-ink-soft"
                >
                  <span>
                    {product?.name} × {formatNumber(qty)}
                  </span>
                  <span className="font-bold">
                    {formatNumber((product?.price ?? 0) * qty)} ج.م
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
        <p className="text-sm font-extrabold">{formatNumber(order.total)} ج.م</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold text-ink-soft transition hover:bg-cream hover:text-brand"
          >
            <ReceiptText className="h-4 w-4" aria-hidden />
            {expanded ? "إخفاء" : "التفاصيل"}
          </button>
          {current ? (
            <button type="button" onClick={onTrack} className="btn-brand h-9 px-5 text-[11px]">
              تتبع الطلب
            </button>
          ) : (
            <button
              type="button"
              onClick={reorder}
              className="rounded-full bg-brand-soft px-5 py-2 text-[11px] font-bold text-brand transition hover:bg-brand-mist"
            >
              اطلب تاني
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function OrdersExperience() {
  const [tracking, setTracking] = useState(false);
  const current = orders.find((order) => order.status === "preparing");
  const previous = orders.filter((order) => order.status !== "preparing");

  useEffect(() => {
    if (!tracking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTracking(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [tracking]);

  return (
    <>
      <MobilePageHeader title="سجل الطلبات" backHref="/profile" />

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-8">
        <div className="hidden lg:block">
          <h1 className="text-4xl font-extrabold">سجل الطلبات</h1>
          <p className="mt-2 text-sm text-muted">تابع طلبك الحالي وارجع لأي طلب قديم بضغطة</p>
        </div>

        <div className="lg:mx-auto lg:max-w-4xl">
          {current ? (
            <section className="mt-4 lg:mt-8">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold">طلبك الحالي</h2>
                <span className="text-[11px] font-semibold text-muted">طلب واحد</span>
              </div>
              <OrderCard order={current} current onTrack={() => setTracking(true)} />
            </section>
          ) : null}

          <section className="mt-7">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">الطلبات السابقة</h2>
              <span className="text-[11px] font-semibold text-muted">
                آخر {formatNumber(previous.length)} طلبات
              </span>
            </div>
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {previous.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </section>
        </div>
      </div>

      {tracking && current ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
          onClick={() => setTracking(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracking-title"
            className="relative w-full max-w-sm rounded-[2rem] border border-line/70 bg-cream p-6 shadow-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setTracking(false)}
              aria-label="إغلاق"
              className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-brand shadow-soft transition hover:bg-brand-soft"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <span className="mx-auto mt-2 grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Truck className="h-8 w-8" aria-hidden />
            </span>
            <h2 id="tracking-title" className="mt-4 text-center text-xl font-extrabold">
              طلبك في الطريق
            </h2>
            <p className="mt-1 text-center text-[11px] text-muted">
              طلب رقم {current.id} · وقت الوصول {current.eta}
            </p>

            <ol className="mt-6 space-y-4">
              {trackingSteps.map((step, index) => {
                const Icon = step.icon;
                const done = index <= 1;
                return (
                  <li key={step.label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-9 w-9 flex-none place-items-center rounded-full border",
                        done
                          ? "border-brand bg-brand text-white"
                          : "border-line bg-white text-muted",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-bold">{step.label}</span>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                    ) : (
                      <span className="text-[10px] text-muted">قادم</span>
                    )}
                  </li>
                );
              })}
            </ol>

            <button
              type="button"
              onClick={() => setTracking(false)}
              className="btn-brand mt-6 h-12 w-full text-sm"
            >
              تمام
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

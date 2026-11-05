"use client";

import Link from "next/link";
import { ArrowLeft, Bike, Store } from "lucide-react";
import { useApp } from "@/components/providers";
import { deliveryFee, formatPrice, productsById } from "@/lib/data";

/**
 * Persistent cart summary. The site chrome mounts it instead of a single
 * screen so it stays pinned to the viewport for the whole scroll on desktop.
 */
export function CartBar({ aboveBottomNav = true }: { aboveBottomNav?: boolean }) {
  const { count, subtotal, lines, t, lang, loggedIn, openLoginPrompt, fulfilment, coupon } = useApp();
  if (count === 0) return null;

  const discount = coupon ? Math.min(Math.round(subtotal * 0.2), 50) : 0;
  const fee = fulfilment === "delivery" ? deliveryFee : 0;
  const total = Math.max(0, subtotal - discount + fee);

  const names = lines
    .slice(0, 2)
    .map((line) => {
      const product = productsById[line.productId];
      return product ? `${t(product.name)} (×${line.qty})` : "";
    })
    .filter(Boolean)
    .join(lang === "ar" ? "، " : ", ");

  return (
    <div
      data-cart-bar
      className={`hidden lg:block ${
        aboveBottomNav
          ? "fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 lg:bottom-5"
          : "fixed inset-x-0 bottom-4 z-40 lg:bottom-5"
      }`}
    >
      <div className="shell">
        <div className="motion-rise flex items-center gap-2.5 rounded-[18px] border border-line bg-white px-2.5 py-2.5 shadow-pop sm:gap-3 md:rounded-[20px] lg:gap-4 lg:rounded-[22px] lg:px-5 lg:py-4">
          <Link
            href="/cart"
            onClick={(event) => {
              if (!loggedIn) {
                event.preventDefault();
                openLoginPrompt();
              }
            }}
            className="motion-press grid size-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-extrabold text-white transition hover:scale-105 lg:size-10 lg:text-sm"
            aria-label={t("السلة")}
          >
            <span key={count} className="motion-badge-pop inline-block">{count}</span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="line-1 text-xs font-extrabold sm:text-sm">
              {t("لديك {count} وجبات في سلة الطلب", { count })}
            </p>
            <p className="line-1 mt-0.5 hidden max-w-md text-[11px] text-muted sm:block">{names}</p>
          </div>
          <span className="ms-1 hidden items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-brand md:flex lg:ms-4">
            {fulfilment === "delivery" ? <Bike className="size-3.5" /> : <Store className="size-3.5" />}
            {fulfilment === "delivery" ? t("توصيل لزهراء المعادي") : t("استلام من الفرع")}
          </span>
          <div className="shrink-0 text-end">
            <p className="hidden text-[10px] text-muted sm:block">{t("الإجمالي")}</p>
            <p className="text-base font-extrabold text-brand lg:text-lg">
              {formatPrice(total)} <span className="text-[10px] font-bold">{t("جنيه")}</span>
            </p>
          </div>
          <Link
            href="/cart"
            onClick={(event) => {
              if (!loggedIn) {
                event.preventDefault();
                openLoginPrompt();
              }
            }}
            className="motion-press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-dark sm:px-5 lg:h-12 lg:gap-2 lg:px-6 lg:text-sm"
          >
            {t("عرض السلة")}
            <ArrowLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}

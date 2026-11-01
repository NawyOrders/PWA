"use client";

import Link from "next/link";
import { ArrowLeft, Bike, Store } from "lucide-react";
import { useApp } from "@/components/providers";
import { deliveryFee, formatPrice, productsById } from "@/lib/data";

export function CartBar() {
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
    <div className="hidden rounded-[22px] border border-line bg-white px-5 py-4 shadow-soft lg:flex lg:items-center lg:gap-4">
      <Link
        href="/cart"
        onClick={(event) => {
          if (!loggedIn) {
            event.preventDefault();
            openLoginPrompt();
          }
        }}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-white"
        aria-label={t("عرض السلة")}
      >
        {count}
      </Link>
      <div className="min-w-0">
        <p className="text-sm font-extrabold">{t("لديك {count} وجبات في سلة الطلب", { count })}</p>
        <p className="line-1 mt-0.5 max-w-md text-[11px] text-muted">{names}</p>
      </div>
      <span className="ms-4 flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold text-brand">
        {fulfilment === "delivery" ? <Bike className="size-3.5" /> : <Store className="size-3.5" />}
        {fulfilment === "delivery" ? t("توصيل لزهراء المعادي") : t("استلام من الفرع")}
      </span>
      <div className="ms-auto text-end">
        <p className="text-[10px] text-muted">{t("الإجمالي")}</p>
        <p className="text-lg font-extrabold text-brand">
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
        className="flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-dark"
      >
        {t("متابعة الطلب والدفع")}
        <ArrowLeft className="size-4 ltr:rotate-180" />
      </Link>
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowLeft, Tag } from "lucide-react";
import { useApp } from "@/components/providers";
import { deliveryFee as baseDeliveryFee, formatPrice, productsById } from "@/lib/data";

export function CartSummary({
  ctaLabel,
  ctaHref,
  onCta,
  ctaDisabled = false,
  showCta = true,
  showItems = false,
  delivery = true,
  note,
  children,
  className = "",
}: {
  ctaLabel: string;
  ctaHref?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  showCta?: boolean;
  showItems?: boolean;
  delivery?: boolean;
  note?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { lines, count, subtotal, t, coupon, applyCoupon, orderNote } = useApp();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const discount = coupon ? Math.min(Math.round(subtotal * 0.2), 50) : 0;
  const fee = delivery ? (subtotal > 0 ? baseDeliveryFee : 0) : 0;
  const total = Math.max(0, subtotal - discount + fee);

  const applyCode = () => {
    if (applyCoupon(code)) {
      setCode("");
      setError("");
    } else {
      setError("كود الخصم غير صحيح");
    }
  };

  const ctaClasses = `mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition ${
    ctaDisabled
      ? "cursor-not-allowed bg-line text-muted"
      : "bg-brand text-white shadow-[0_16px_30px_-18px_rgba(232,69,44,0.9)] hover:bg-brand-dark"
  }`;

  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">{t("ملخص الطلب")}</h2>
        <span className="text-[11px] text-muted">{count} {t("أصناف")}</span>
      </div>

      {showItems ? (
        <ul className="mt-4 space-y-3.5">
          {lines.map((line) => {
            const product = productsById[line.productId];
            if (!product) return null;
            return (
              <li key={line.key} className="flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-peach">
                  <Image src={product.image} alt={t(product.name)} fill sizes="56px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{t(product.name)}</p>
                  <p className="text-[11px] text-muted">{t("الكمية: {qty}", { qty: line.qty })}</p>
                </div>
                <span className="whitespace-nowrap text-sm font-extrabold text-brand">
                  {formatPrice(line.price * line.qty)} {t("جنيه")}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {orderNote ? (
        <p className="mt-3 rounded-xl bg-cream-50 px-3 py-2 text-[11px] leading-5 text-muted">
          <span className="font-bold text-ink">{t("ملاحظات على الطلب")}: </span>
          {orderNote}
        </p>
      ) : null}

      {children}

      <div className="mt-4">
        <p className="text-xs font-bold">{t("عندك كود خصم؟")}</p>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyCode();
              }}
              placeholder={t("أدخل كود الخصم")}
              aria-label={t("كود الخصم")}
              className="h-11 w-full rounded-xl border border-line bg-cream-50 pe-9 ps-3 text-xs outline-none transition focus:border-brand/50"
            />
          </div>
          <button
            type="button"
            onClick={applyCode}
            className="h-11 rounded-xl bg-brand-soft px-4 text-xs font-bold text-brand transition hover:bg-brand/15"
          >
            {t("تطبيق")}
          </button>
        </div>
        {error ? <p className="mt-1.5 text-[11px] font-semibold text-brand">{t(error)}</p> : null}
        {coupon ? (
          <p className="mt-1.5 text-[11px] font-semibold text-success">
            {t("تم تطبيق كود {code} — خصم 20%", { code: coupon })}
          </p>
        ) : null}
      </div>

      <dl className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">{t("المجموع الفرعي ({count} أصناف)", { count })}</dt>
          <dd className="font-bold">{formatPrice(subtotal)} {t("جنيه")}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">{t("رسوم التوصيل")}</dt>
          <dd className="font-bold">
            {delivery ? `${formatPrice(fee)} ${t("جنيه")}` : t("استلام من الفرع")}
          </dd>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between text-success">
            <dt>{t("الخصم (NAWY20)")}</dt>
            <dd className="font-bold">- {formatPrice(discount)} {t("جنيه")}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-line pt-3">
          <dt className="text-base font-extrabold">{t("الإجمالي")}</dt>
          <dd className="text-2xl font-extrabold text-brand">
            {formatPrice(total)} <span className="text-xs font-bold">{t("جنيه")}</span>
          </dd>
        </div>
      </dl>

      {showCta ? (
        ctaHref && !ctaDisabled ? (
          <Link href={ctaHref} className={ctaClasses}>
            {t(ctaLabel)}
            <ArrowLeft className="size-4 ltr:rotate-180" />
          </Link>
        ) : (
          <button type="button" onClick={onCta} disabled={ctaDisabled} className={ctaClasses}>
            {t(ctaLabel)}
            <ArrowLeft className="size-4 ltr:rotate-180" />
          </button>
        )
      ) : null}

      <p className="mt-3 text-center text-[10px] leading-5 text-muted">
        {t(note ?? "هتراجع بيانات التوصيل والدفع قبل تأكيد الطلب.")}
      </p>
    </div>
  );
}

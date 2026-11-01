"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock3, MapPin, Store } from "lucide-react";
import { branches } from "@/lib/data";
import { CartSummary } from "@/components/cart-summary";
import { CheckoutShell, buttonStyles } from "@/components/ui";
import { useApp } from "@/components/providers";

export function BranchView() {
  const { t, setFulfilment } = useApp();
  const [selected, setSelected] = useState(branches[0].id);
  const branch = branches.find((item) => item.id === selected) ?? branches[0];

  useEffect(() => {
    setFulfilment("pickup");
  }, [setFulfilment]);

  return (
    <CheckoutShell
      activeStep={1}
      title="استلم اوردرك من الفرع مباشر"
      subtitle="اختار الفرع الأقرب ليك للاستلام، وهيكون طلبك جاهز في ميعاده."
      backHref="/cart"
      backLabel="الرجوع للسلة"
      breadcrumb={[
        { label: "الرئيسية", href: "/" },
        { label: "السلة", href: "/cart" },
        { label: "اختيار الفرع" },
      ]}
      mobileTitle="اختيار الفرع"
      main={
        <>
          <div className="card flex items-center justify-between gap-3 px-4 py-4 lg:px-5">
            <div>
              <h2 className="text-base font-extrabold lg:text-lg">{t("اختار الفرع")}</h2>
              <p className="mt-1 text-[11px] text-muted">{t("اختار الأقرب ليك للاستلام")}</p>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
              <Store className="size-5" />
            </span>
          </div>

          <div className="space-y-2.5">
            {branches.map((item) => {
              const active = item.id === selected;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-start shadow-soft transition ${
                    active ? "border-brand" : "border-transparent hover:border-brand/25"
                  }`}
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${
                      active ? "border-brand" : "border-[#d8c9bc]"
                    }`}
                  >
                    {active ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold">{t(item.name)}</span>
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-[9px] font-bold text-success">
                        {t("مفتوح الآن")}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-5 text-muted">{t(item.address)}</span>
                    <span className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-ink/70">
                      <MapPin className="size-3.5 text-brand" />
                      {item.distance} {t("كم")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[10px] text-muted">{t("الفرع المختار")}</p>
              <p className="mt-1 text-sm font-extrabold text-brand">{t(branch.name)}</p>
            </div>
            <Link href="/checkout/payment" className={buttonStyles({ size: "sm" })}>
              {t("تأكيد الفرع")}
              <ArrowLeft className="size-3.5 ltr:rotate-180" />
            </Link>
          </div>

          <div className="card flex items-center gap-2 px-4 py-3 text-[11px] font-semibold text-muted">
            <Clock3 className="size-4 text-brand" />
            {t("وقت الاستلام المتوقع: 1:00 - 1:30 مساءً")}
          </div>
        </>
      }
      aside={
        <>
          <CartSummary
            showItems
            delivery={false}
            ctaLabel="المتابعة للدفع"
            ctaHref="/checkout/payment"
            note="هتختار طريقة الدفع في الخطوة الجاية."
          />
          <div className="card flex items-center gap-3 p-4">
            <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">
              <Store className="size-4" />
            </span>
            <div>
              <p className="text-[10px] text-muted">{t("الاستلام من")}</p>
              <p className="text-xs font-bold">{t(branch.name)}</p>
              <p className="text-[10px] text-muted">{t(branch.address)}</p>
            </div>
          </div>
        </>
      }
    />
  );
}

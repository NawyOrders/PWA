"use client";

import Image from "next/image";
import { Trash2, Wallet } from "lucide-react";
import { useApp } from "@/components/providers";
import { productsById } from "@/lib/data";
import { CartSummary } from "@/components/cart-summary";
import { CheckoutShell, EmptyState, MobilePageHeader, Price, QtyStepper } from "@/components/ui";

function CartItem({ lineKey }: { lineKey: string }) {
  const { lines, changeQty, removeLine, t, lang } = useApp();
  const line = lines.find((item) => item.key === lineKey);
  if (!line) return null;
  const product = productsById[line.productId];
  if (!product) return null;

  return (
    <article className="relative flex gap-3 rounded-[24px] bg-white p-3 shadow-soft lg:gap-4 lg:p-4">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-peach lg:size-32">
        <Image src={product.image} alt={t(product.name)} fill sizes="128px" className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="pe-12 text-base font-extrabold lg:text-lg">{t(product.name)}</h3>
        <p className="mt-1 line-2 text-[11px] leading-5 text-muted">{t(product.description)}</p>
        {line.extras?.length ? (
          <p className="mt-1 text-[10px] font-semibold text-brand">
            {t("الإضافات: ")}
            {line.extras.map((extra) => t(extra)).join(lang === "ar" ? "، " : ", ")}
          </p>
        ) : null}
        {line.note ? <p className="mt-1 text-[10px] text-muted">{t("ملاحظات: ")}{line.note}</p> : null}
        <div className="mt-2 flex items-center justify-between gap-2">
          <Price value={line.price * line.qty} size="md" />
          <QtyStepper
            value={line.qty}
            min={1}
            onChange={(next) => changeQty(line.key, next - line.qty)}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => removeLine(line.key)}
        className="absolute end-3 top-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted transition hover:text-brand"
        aria-label={t("حذف {name}", { name: t(product.name) })}
      >
        <Trash2 className="size-3.5" />
        {t("حذف")}
      </button>
    </article>
  );
}

export function CartView() {
  const { lines, count, t, fulfilment: mode, orderNote, setOrderNote } = useApp();

  if (lines.length === 0) {
    return (
      <div>
        <MobilePageHeader title="السلة" />
        <div className="shell pb-7 lg:py-12">
          <EmptyState
            title="سلتك فاضية"
            description="لسه مضفتش حاجة، اختار طبقك المفضل من القائمة وابدأ طلبك."
          />
        </div>
      </div>
    );
  }

  return (
    <CheckoutShell
      activeStep={0}
      title="سلتك فيها كل اللي بتحبه"
      subtitle="راجع طلبك، وعدّل الكمية قبل ما تكمل."
      backHref="/"
      backLabel="الرجوع للرئيسية"
      breadcrumb={[{ label: "الرئيسية", href: "/" }, { label: "السلة" }]}
      mobileTitle="السلة"
      main={
        <>
          <div className="hidden items-center justify-between lg:flex">
            <h2 className="text-lg font-extrabold">{t("الأصناف في السلة")}</h2>
            <span className="text-[11px] text-muted">{count} {t("أصناف")}</span>
          </div>

          <div className="space-y-3">
            {lines.map((line) => (
              <CartItem key={line.key} lineKey={line.key} />
            ))}
          </div>

          <div className="card p-4 lg:p-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              {t("ملاحظات على الطلب")}
              <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[9px] font-semibold text-muted">{t("اختياري")}</span>
            </h2>
            <textarea
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value.slice(0, 200))}
              rows={3}
              placeholder={t("عندك أي طلب خاص؟ اكتبه هنا...")}
              className="mt-2.5 w-full resize-none rounded-xl border border-line bg-cream-50 px-4 py-3 text-xs leading-6 outline-none transition focus:border-brand/40"
            />
          </div>
        </>
      }
      aside={
        <>
          <CartSummary
            ctaLabel="المتابعة لإتمام الطلب"
            ctaHref="/checkout/pickup"
            delivery={mode === "delivery"}
            note="هتراجع بيانات التوصيل والدفع قبل تأكيد الطلب."
          />

          <div className="hidden items-center gap-2 rounded-2xl bg-brand-soft/60 px-4 py-3 text-[11px] font-semibold text-brand-dark lg:flex">
            <Wallet className="size-4" />
            {t("جرّب كود NAWY20 واستمتع بخصم 20% لحد 50 جنيه.")}
          </div>
        </>
      }
    />
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, Ticket, X } from "lucide-react";
import { AuthGateModal } from "@/components/auth/auth-gate-modal";
import { Price } from "@/components/ui/price";
import { cn, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

function Row({
  label,
  value,
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-2 text-sm",
        strong && "text-base",
      )}
    >
      <span className={strong ? "font-extrabold" : "text-ink-soft"}>{label}</span>
      <span className={strong ? "font-extrabold text-brand" : "font-semibold"}>{value}</span>
    </div>
  );
}

export function SummaryCard({
  ctaHref = "/cart/delivery",
  ctaLabel = "المتابعة لإتمام الطلب",
  caption = "هناك عنوان وتختار طريقة الدفع في الخطوة الجاية",
  hideCta = false,
  authGated = false,
  showPromo = true,
  showItems = false,
  topAction,
  className,
}: {
  ctaHref?: string;
  ctaLabel?: string;
  caption?: string;
  hideCta?: boolean;
  authGated?: boolean;
  showPromo?: boolean;
  showItems?: boolean;
  topAction?: ReactNode;
  className?: string;
}) {
  const {
    lines,
    count,
    subtotal,
    deliveryFee,
    discount,
    total,
    promo,
    applyPromo,
    clearPromo,
    loggedIn,
  } = useStore();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const submitPromo = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setFeedback({ ok: false, text: "اكتب كود الخصم الأول" });
      return;
    }
    if (applyPromo(code)) {
      setFeedback({ ok: true, text: `تم تطبيق كود الخصم ${code.trim().toUpperCase()}` });
      setCode("");
    } else {
      setFeedback({ ok: false, text: "الكود غير صحيح، جرب كود NAWY10" });
    }
  };

  return (
    <div className={cn("card relative p-5 sm:p-6", className)}>
      {topAction ? <div className="absolute end-5 top-6">{topAction}</div> : null}
      <h2 className="text-center text-xl font-extrabold">ملخص الطلب</h2>

      {showItems ? (
        <div className="mt-4 space-y-1 border-b border-line pb-3">
          {lines.map((line) => (
            <div key={line.key} className="flex items-center gap-3 py-1.5">
              <div className="relative h-11 w-11 flex-none overflow-hidden rounded-lg bg-peach">
                <Image
                  src={line.image}
                  alt={line.name}
                  fill
                  sizes="44px"
                  className="object-cover object-center"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{line.name}</p>
                <p className="text-[10px] text-muted">الكمية: {formatNumber(line.qty)}</p>
              </div>
              <Price value={line.unitPrice * line.qty} size="sm" />
            </div>
          ))}
        </div>
      ) : null}

      {showPromo ? (
        <div className="mt-5">
          <p className="text-sm font-bold text-ink-soft">عندك كود خصم؟</p>
          {promo ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-brand-mist bg-brand-soft/50 px-3 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                <Check className="h-4 w-4" aria-hidden />
                {promo} — خصم 10%
              </span>
              <button
                type="button"
                onClick={() => {
                  clearPromo();
                  setFeedback(null);
                }}
                aria-label="إزالة كود الخصم"
                className="grid h-6 w-6 place-items-center rounded-full text-brand transition hover:bg-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : (
            <form
              onSubmit={submitPromo}
              className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 focus-within:border-brand/50 focus-within:shadow-[0_0_0_4px_rgba(237,66,39,0.1)]"
            >
              <Ticket className="ms-2 h-4 w-4 flex-none text-muted" aria-hidden />
              <label htmlFor="promo-code" className="sr-only">
                كود الخصم
              </label>
              <input
                id="promo-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ادخل كود الخصم"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-[#b7a79c]"
              />
              <button
                type="submit"
                className="flex-none rounded-lg bg-brand-soft px-4 py-1.5 text-xs font-bold text-brand transition hover:bg-brand-mist"
              >
                تطبيق
              </button>
            </form>
          )}
          {feedback ? (
            <p
              className={cn(
                "mt-2 text-[11px] font-semibold",
                feedback.ok ? "text-success" : "text-brand",
              )}
              aria-live="polite"
            >
              {feedback.text}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 border-t border-line pt-2">
        <Row
          label={`المجموع الفرعي (${formatNumber(count)} أصناف)`}
          value={`${formatNumber(subtotal)} جنيه`}
        />
        <Row
          label="رسوم التوصيل"
          value={deliveryFee === 0 ? "مجانًا" : `${formatNumber(deliveryFee)} جنيه`}
        />
        {discount > 0 ? (
          <Row label="الخصم" value={`- ${formatNumber(discount)} جنيه`} />
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-line pt-4">
        <span className="text-lg font-extrabold">الإجمالي</span>
        <span className="text-2xl font-extrabold text-brand">
          {formatNumber(total)}
          <span className="ms-1 text-xs font-bold">جنيه</span>
        </span>
      </div>

      {hideCta ? null : (
        <>
          {authGated && !loggedIn ? (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              disabled={count === 0}
              className="btn-brand mt-5 h-14 w-full justify-between px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{ctaLabel}</span>
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <Link
              href={ctaHref}
              aria-disabled={count === 0}
              className={cn(
                "btn-brand mt-5 h-14 w-full justify-between px-5 text-sm",
                count === 0 && "pointer-events-none opacity-60",
              )}
            >
              <span>{ctaLabel}</span>
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          )}
        </>
      )}

      {caption ? (
        <p className="mt-3 text-center text-[10px] leading-5 text-muted">{caption}</p>
      ) : null}

      <AuthGateModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        nextHref={ctaHref}
      />
    </div>
  );
}

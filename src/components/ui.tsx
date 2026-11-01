"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { useApp } from "@/components/providers";

export function Price({
  value,
  oldValue,
  className = "",
  size = "md",
  compact = false,
}: {
  value: number;
  oldValue?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  compact?: boolean;
}) {
  const { t } = useApp();
  const valueSize = compact ? "text-lg" : size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <span className={`inline-flex items-baseline ${compact ? "gap-1" : "gap-1.5"} ${className}`}>
      <span className={`${valueSize} font-extrabold text-brand`}>{formatPrice(value)}</span>
      <span className={`${compact ? "text-[10px]" : "text-[11px]"} font-bold text-brand`}>{t("جنيه")}</span>
      {oldValue ? (
        <del
          className={`inline-flex items-baseline gap-1 ${compact ? "text-[10px]" : "text-[11px]"} font-semibold text-muted`}
          aria-label={t("السعر قبل الخصم {old}", { old: formatPrice(oldValue) })}
        >
          {formatPrice(oldValue)}
          <span className={compact ? "text-[9px]" : "text-[10px]"}>{t("جنيه")}</span>
        </del>
      ) : null}
    </span>
  );
}

export function HotBadge({ label = "الأكثر طلباً" }: { label?: string }) {
  const { t } = useApp();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_8px_18px_-10px_rgba(232,69,44,0.9)]"
      style={{ backgroundImage: "linear-gradient(270deg, #f79a4b 0%, #e8452c 100%)" }}
    >
      <Flame className="size-3 fill-white/30" />
      {t(label)}
    </span>
  );
}

export function FavoriteButton({
  productId,
  className = "size-10",
  alwaysWhite = false,
}: {
  productId: string;
  className?: string;
  alwaysWhite?: boolean;
}) {
  const { isFavorite, toggleFavorite, t } = useApp();
  const active = isFavorite(productId);
  return (
    <button
      type="button"
      aria-label={t(active ? "إزالة من المفضلة" : "إضافة إلى المفضلة")}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(productId);
      }}
      className={`grid place-items-center rounded-full transition active:scale-90 ${
        alwaysWhite || active ? "bg-white shadow-[0_8px_20px_-12px_rgba(60,30,15,0.5)]" : "bg-white/90"
      } ${className}`}
    >
      <Heart
        className={`size-[46%] transition ${active ? "fill-brand text-brand" : "text-[#7f746c]"}`}
        strokeWidth={1.8}
      />
    </button>
  );
}

export function AddButton({
  onClick,
  className = "size-11",
  label = "أضف إلى السلة",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  const { t } = useApp();
  return (
    <button
      type="button"
      aria-label={t(label)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`grid place-items-center rounded-full bg-brand text-white shadow-[0_12px_24px_-12px_rgba(232,69,44,0.9)] transition hover:bg-brand-dark active:scale-90 ${className}`}
    >
      <Plus className="size-[50%]" strokeWidth={2.4} />
    </button>
  );
}

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const { t } = useApp();
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-line bg-white p-1 ${className}`}
      role="group"
      aria-label={t("الكمية")}
    >
      <button
        type="button"
        aria-label={t("زيادة الكمية")}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid size-8 place-items-center rounded-full border border-brand/35 bg-brand-soft/70 text-brand transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="size-4" strokeWidth={2.4} />
      </button>
      <span className="min-w-6 text-center text-base font-extrabold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={t("إنقاص الكمية")}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid size-8 place-items-center rounded-full text-ink transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="size-4" />
      </button>
    </div>
  );
}

export function SectionTitle({
  title,
  icon,
  action,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  action?: { label: string; href: string; icon?: ReactNode };
  className?: string;
}) {
  const { t } = useApp();
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 className="flex items-center gap-2 text-lg font-extrabold lg:text-xl">
        {icon}
        {t(title)}
      </h2>
      {action ? (
        <Link
          href={action.href}
          className="flex items-center gap-1.5 text-xs font-bold text-brand transition hover:text-brand-dark lg:text-sm"
        >
          {t(action.label)}
          {action.icon}
        </Link>
      ) : null}
    </div>
  );
}

export function MobilePageHeader({
  title,
  backHref = "/",
  action,
  className = "",
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
  className?: string;
}) {
  const { t } = useApp();
  return (
    <header className={`flex items-center justify-between px-4 pb-4 pt-6 lg:hidden ${className}`}>
      <Link
        href={backHref}
        aria-label={t("رجوع")}
        className="grid size-11 place-items-center rounded-2xl border border-line bg-white text-ink shadow-soft transition active:scale-95"
      >
        <ChevronRight className="size-5 ltr:rotate-180" />
      </Link>
      <h1 className="text-lg font-extrabold">{t(title)}</h1>
      <div className="flex min-w-11 justify-end">{action}</div>
    </header>
  );
}

export function DisplayPageHeader({
  title,
  subtitle,
  backHref = "/",
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
  className?: string;
}) {
  const { t } = useApp();
  return (
    <header className={`px-5 pb-6 pt-6 lg:hidden ${className}`}>
      <div className="flex justify-start">
        {action ?? (
          <Link
            href={backHref}
            aria-label={t("رجوع")}
            className="grid size-12 place-items-center rounded-full bg-white/80 text-ink shadow-soft transition active:scale-95"
          >
            <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.1} />
          </Link>
        )}
      </div>
      <h1 className="mt-6 text-start font-display text-[42px] font-extrabold leading-[1.15] lg:text-[46px]">
        {t(title)}
      </h1>
      {subtitle ? (
        <p className="mt-3 text-start text-sm leading-6 text-muted">{t(subtitle)}</p>
      ) : null}
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const { t } = useApp();
  return (
    <nav aria-label={t("مسار التنقل")} className="hidden items-center gap-1.5 text-xs text-muted lg:flex">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.href && !last ? (
              <Link href={item.href} className="transition hover:text-brand">
                {t(item.label)}
              </Link>
            ) : (
              <span className={last ? "font-semibold text-brand" : ""}>{t(item.label)}</span>
            )}
            {!last ? <ChevronLeft className="size-3.5 opacity-60 ltr:rotate-180" /> : null}
          </span>
        );
      })}
    </nav>
  );
}

const steps = [
  { label: "مراجعة السلة", href: "/cart" },
  { label: "بيانات التوصيل", href: "/checkout/delivery" },
  { label: "الدفع", href: "/checkout/payment" },
];

export function CheckoutSteps({ active }: { active: 0 | 1 | 2 }) {
  const { t } = useApp();
  return (
    <ol className="hidden items-center gap-2 text-[11px] lg:flex">
      {steps.map((step, index) => {
        const done = index < active;
        return (
          <li key={step.label} className="flex items-center gap-2">
            <Link href={step.href} className="flex items-center gap-1.5">
              <span
                className={`grid size-5 place-items-center rounded-full border text-[9px] font-bold ${
                  done
                    ? "border-brand bg-brand text-white"
                    : index === active
                      ? "border-brand text-brand"
                      : "border-muted/40 text-muted"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={
                  index === active
                    ? "font-bold text-brand"
                    : done
                      ? "text-ink/70"
                      : "text-muted"
                }
              >
                {t(step.label)}
              </span>
            </Link>
            {index < steps.length - 1 ? <ChevronLeft className="size-3.5 text-muted/70 ltr:rotate-180" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutShell({
  title,
  subtitle,
  activeStep,
  backHref,
  backLabel,
  breadcrumb,
  mobileTitle,
  main,
  aside,
}: {
  title: string;
  subtitle: string;
  activeStep: 0 | 1 | 2;
  backHref: string;
  backLabel: string;
  breadcrumb: { label: string; href?: string }[];
  mobileTitle: string;
  main: ReactNode;
  aside: ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="pb-10">
      <MobilePageHeader title={mobileTitle} backHref={backHref} />
      <div className="shell lg:pt-8">
        <div className="hidden items-center justify-between lg:flex">
          <Breadcrumbs items={breadcrumb} />
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t(backLabel)}
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Link>
        </div>

        <div className="mt-4 hidden items-end justify-between gap-8 lg:flex">
          <div className="order-2 text-end">
            <CheckoutSteps active={activeStep} />
          </div>
          <div className="order-1 max-w-xl text-start">
            <h1 className="text-[34px] font-extrabold leading-[1.25]">{t(title)}</h1>
            <p className="mt-2 text-sm leading-7 text-muted">{t(subtitle)}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
          <div className="min-w-0 space-y-4 lg:space-y-5">{main}</div>
          <aside className="w-full space-y-4 lg:sticky lg:top-24">{aside}</aside>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  ctaLabel = "تصفح الأقسام",
  ctaHref = "/categories",
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const { t } = useApp();
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
        <ShoppingBag className="size-7" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold">{t(title)}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{t(description)}</p>
      <Link href={ctaHref} className="btn-brand mt-6 h-11 px-7 text-sm">
        {t(ctaLabel)}
      </Link>
    </div>
  );
}

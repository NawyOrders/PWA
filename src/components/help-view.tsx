"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  CircleHelp,
  MessageCircle,
  Phone,
  Send,
  X,
  type LucideProps,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs, buttonStyles } from "@/components/ui";
import { helpCards } from "@/lib/account-data";

const cardIcons: Record<string, ComponentType<LucideProps>> = {
  help: CircleHelp,
  chat: MessageCircle,
  send: Send,
  alert: AlertTriangle,
};

const cardHrefs: Record<string, string> = {
  faq: "/help/faq",
  chat: "/help/chat",
  feedback: "/help/feedback",
  report: "/help/report",
};

export function HelpView() {
  const { t } = useApp();

  return (
    <div className="pb-10">
      <div className="bg-gradient-to-b from-peach to-cream px-4 pb-2 pt-6 lg:hidden">
        <Link
          href="/settings"
          aria-label={t("رجوع")}
          className="grid size-12 place-items-center rounded-full bg-white text-ink shadow-soft transition active:scale-95"
        >
          <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
        </Link>
        <h1 className="mt-10 text-start text-[40px] font-extrabold leading-[1.3]">
          {t("المساعدة والدعم")}
        </h1>
        <p className="mt-3 text-start text-sm font-semibold text-muted">
          {t("نحن هنا لمساعدتك في ايه وقت")}
        </p>
      </div>

      <div className="shell">
        <div className="hidden lg:pt-8">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "المساعدة والدعم" },
            ]}
          />
        </div>

        <div className="mx-auto max-w-[640px] px-4 lg:max-w-3xl lg:px-0">
          <div className="relative lg:mt-6 lg:rounded-[28px] lg:bg-white lg:p-8 lg:shadow-soft">
            <Link
              href="/settings"
              aria-label={t("اغلاق")}
              className="absolute start-6 top-6 hidden size-12 place-items-center rounded-full border border-line bg-white text-ink transition hover:text-brand lg:grid"
            >
              <X className="size-5" strokeWidth={2.2} />
            </Link>

            <div className="hidden text-center lg:block">
              <h1 className="text-[34px] font-extrabold">{t("المساعدة والدعم")}</h1>
              <p className="mt-2 text-sm text-muted">{t("نحن هنا لمساعدتك في ايه وقت")}</p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:mt-12 lg:gap-5">
              {helpCards.map((card) => {
                const Icon = cardIcons[card.icon];
                return (
                  <Link
                    key={card.id}
                    href={cardHrefs[card.id]}
                    className="card animate-float-in relative flex flex-col items-center gap-1 px-4 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-pop lg:flex-col lg:items-start lg:px-6 lg:py-7 lg:text-start"
                  >
                    <span className="grid size-16 place-items-center rounded-[22px] bg-brand text-white shadow-[0_16px_28px_-16px_rgba(232,69,44,0.9)] lg:size-12 lg:rounded-2xl lg:bg-brand-soft lg:text-brand lg:shadow-none">
                      <Icon className="size-8 lg:size-6" strokeWidth={1.8} />
                    </span>
                    <span className="mt-4 block text-sm font-extrabold leading-6 lg:mt-4 lg:text-base">
                      {t(card.label)}
                    </span>
                    <span className="text-xs text-muted lg:text-[13px]">{t(card.note)}</span>
                    <ChevronLeft className="absolute end-5 top-1/2 hidden size-5 -translate-y-1/2 text-muted lg:block ltr:rotate-180" />
                  </Link>
                );
              })}
            </div>

            <a
              href="tel:19885"
              className={buttonStyles({ size: "lg", block: true, className: "mt-8 lg:mt-10" })}
            >
              {t("تواصل معنا")}
              <Phone className="size-5" strokeWidth={2.1} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

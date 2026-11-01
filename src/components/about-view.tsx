"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { ChevronLeft, Layers, Shield, ShieldCheck, Workflow, type LucideProps } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useApp } from "@/components/providers";
import { MobilePageHeader } from "@/components/ui";
import { appVersion, platforms, policyTabs } from "@/lib/account-data";

type TabId = (typeof policyTabs)[number]["id"];

const linkIcons: Record<TabId, ComponentType<LucideProps>> = {
  privacy: Shield,
  terms: ShieldCheck,
  data: Workflow,
};

const links = policyTabs.map((tab) => ({ ...tab, icon: linkIcons[tab.id] }));

export function AboutView() {
  const { t } = useApp();

  return (
    <div className="pb-12">
      <MobilePageHeader title="" backHref="/settings" />

      <div className="shell">
        <div className="mx-auto max-w-[640px] lg:max-w-4xl">
          <h1 className="text-start font-display text-[40px] font-extrabold leading-[1.15] text-ink">
            {t("عن التطبيق")}
          </h1>

          <div className="card relative mt-6 flex items-center gap-4 overflow-hidden bg-cream-50 px-5 py-6 lg:mt-8">
            <div className="min-w-0 flex-1 text-start">
              <p className="font-display text-2xl font-extrabold text-brand">{t("ناوي أوردرز")}</p>
              <p className="mt-1.5 text-sm text-muted">{t("ناوي أوردرز — طعم يوصلك لباب البيت.")}</p>
            </div>
            <LogoMark className="size-14 shrink-0" />
          </div>

          <div className="mt-4 space-y-3">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.id}
                  href={`/help/policies?tab=${link.id}`}
                  className="card flex items-center gap-3 px-4 py-3.5 transition hover:bg-cream-50"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#f9b234] to-[#f6891f] text-[#3a2408] shadow-[0_12px_22px_-14px_rgba(246,137,31,0.95)]">
                    <Icon className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 text-sm font-extrabold">{t(link.label)}</span>
                  <ChevronLeft className="size-4 text-ink/60 ltr:rotate-180" />
                </Link>
              );
            })}
          </div>

          <h2 className="mt-8 text-start text-xl font-extrabold text-ink">{t("المنصة")}</h2>

          <div className="mt-4 space-y-3">
            {platforms.map((platform) => (
              <PlatformCard key={platform.id} platform={platform} />
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <div className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-extrabold text-ink shadow-soft">
              <Layers className="size-4 text-brand" strokeWidth={2.2} />
              {t("الاصدار رقم {version}", { version: appVersion })}
            </div>
          </div>

          <p className="mt-8 text-center text-sm font-bold text-gold">
            {t("© 2026 ناوي أوردرز — جميع الحقوق محفوظة.")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ platform }: { platform: (typeof platforms)[number] }) {
  const { t } = useApp();
  const isBrand = platform.tone === "brand";
  return (
    <div className="flex items-center gap-3 rounded-[22px] bg-[#2b1a12] p-4 shadow-soft">
      <div className="min-w-0 flex-1 text-start">
        <p className={`text-xs font-bold ${isBrand ? "text-gold" : "text-[#c07bff]"}`}>{t(platform.role)}</p>
        <p className="mt-1 truncate text-lg font-extrabold text-white" dir="ltr">
          {platform.name}
        </p>
      </div>
      {isBrand ? (
        <LogoMark className="size-12 shrink-0" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#c07bff]/70 bg-[#1a1016] text-[13px] font-extrabold text-[#c07bff]">
          {platform.initials}
        </span>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { Layers, Shield, ShieldCheck, Workflow, X, type LucideProps } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useApp } from "@/components/providers";
import { MobilePageHeader, chipStyles } from "@/components/ui";
import { appVersion, platforms, policies, policyTabs, policyUpdated } from "@/lib/account-data";

type TabId = (typeof policyTabs)[number]["id"];

const tabIcons: Record<TabId, ComponentType<LucideProps>> = {
  privacy: Shield,
  terms: ShieldCheck,
  data: Workflow,
};

function isTabId(value: string | null): value is TabId {
  return value === "privacy" || value === "terms" || value === "data";
}

export function PoliciesView() {
  const { t } = useApp();
  const [active, setActive] = useState<TabId>("privacy");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (isTabId(tab)) setActive(tab);
  }, []);

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % policyTabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + policyTabs.length) % policyTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = policyTabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    setActive(policyTabs[next].id);
    tabRefs.current[next]?.focus();
  };

  const article = policies[active];

  return (
    <div className="pb-12">
      <MobilePageHeader title="" backHref="/settings" />

      <div className="shell">
        <div className="mx-auto max-w-[640px] lg:max-w-4xl">
          <div className="card relative mt-6 px-5 py-7 lg:mt-8 lg:px-8 lg:py-9">

            <Link
              href="/help"
              aria-label={t("إغلاق")}
              className="absolute top-6 grid size-11 place-items-center rounded-full border border-line bg-white text-ink shadow-soft transition hover:text-brand start-6 hidden lg:grid"
            >
              <X className="size-5" strokeWidth={2} />
            </Link>

            <div className="flex flex-col items-center pb-6 text-center">
              <LogoMark className="size-14" />
              <p className="mt-3 font-display text-2xl font-extrabold text-brand">{t("ناوي اوردرز")}</p>
              <p className="mt-1 text-sm text-muted">{t("ناوي أوردرز — طعم يوصلك لباب البيت.")}</p>
            </div>

            <div
              role="tablist"
              aria-label={t("السياسات")}
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:justify-center lg:overflow-visible lg:px-0 lg:pb-0"
            >
              {policyTabs.map((tab, index) => {
                const Icon = tabIcons[tab.id];
                const selected = tab.id === active;
                return (
                  <button
                    key={tab.id}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="policy-panel"
                    id={`policy-tab-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(tab.id)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                    className={chipStyles(selected)}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-[9px] ${
                        selected ? "bg-white/20 text-white" : "bg-brand-soft text-brand"
                      }`}
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </span>
                    {t(tab.label)}
                  </button>
                );
              })}
            </div>

            <div className="mt-7 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-8">
              <div
                role="tabpanel"
                id="policy-panel"
                aria-labelledby={`policy-tab-${active}`}
                tabIndex={0}
                className="animate-float-in min-w-0 outline-none"
              >
                {article.sections.map((section, index) => (
                  <section
                    key={section.id}
                    className={index > 0 ? "mt-6 border-t border-line pt-6 lg:mt-7 lg:pt-7" : ""}
                  >
                    <h2 className="text-lg font-extrabold text-gold lg:text-xl">{t(section.title)}</h2>
                    <p className="mt-2.5 text-sm leading-7 text-muted lg:text-justify lg:leading-8">
                      {t(section.body)}
                    </p>
                  </section>
                ))}
              </div>

              <aside className="mt-8 hidden lg:mt-1 lg:block">
                <h2 className="text-start text-lg font-extrabold text-ink">{t("المنصات")}</h2>
                <div className="mt-4 space-y-3">
                  {platforms.map((platform) => (
                    <PlatformCard key={platform.id} platform={platform} />
                  ))}
                  <VersionPill />
                </div>
              </aside>
            </div>
          </div>

          <aside className="mt-8 lg:hidden">
            <h2 className="text-start text-lg font-extrabold text-ink">{t("المنصات")}</h2>
            <div className="mt-4 space-y-3">
              {platforms.map((platform) => (
                <PlatformCard key={platform.id} platform={platform} />
              ))}
              <VersionPill />
            </div>
          </aside>

          <p className="mt-8 text-center text-sm font-bold text-gold">
            {t("آخر تحديث: {date}", { date: policyUpdated })}
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
    <div className="flex items-center gap-3 rounded-[22px] bg-cocoa p-4 shadow-soft">
      <div className="min-w-0 flex-1 text-start">
        <p className={`text-xs font-bold ${isBrand ? "text-gold" : "text-violet"}`}>{t(platform.role)}</p>
        <p className="mt-1 truncate text-lg font-extrabold text-white" dir="ltr">
          {platform.name}
        </p>
      </div>
      {isBrand ? (
        <LogoMark className="size-12 shrink-0" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-violet/70 bg-violet-deep text-[13px] font-extrabold text-violet">
          {platform.initials}
        </span>
      )}
    </div>
  );
}

function VersionPill() {
  const { t } = useApp();
  return (
    <div className="flex h-12 items-center justify-center gap-2 rounded-full bg-white text-sm font-extrabold text-ink shadow-soft">
      <Layers className="size-4 text-gold" strokeWidth={2.2} />
      {t("الاصدار رقم {version}", { version: appVersion })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Phone, Search } from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs } from "@/components/ui";
import { faqItems } from "@/lib/account-data";

export function FaqView() {
  const { t } = useApp();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(faqItems[0].id);

  const visible = useMemo(() => {
    const needle = query.trim();
    if (!needle) return faqItems;
    return faqItems.filter(
      (item) => item.question.includes(needle) || item.answer.includes(needle),
    );
  }, [query]);

  return (
    <div className="pb-10">
      <div className="bg-gradient-to-b from-peach to-cream px-4 pb-2 pt-6 lg:hidden">
        <Link
          href="/help"
          aria-label={t("رجوع")}
          className="grid size-12 place-items-center rounded-full bg-white text-ink shadow-soft transition active:scale-95"
        >
          <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
        </Link>
        <h1 className="mt-10 text-start text-[40px] font-extrabold leading-[1.3]">
          {t("الاسئلة الشائعة")}
        </h1>
        <p className="mt-3 text-start text-sm font-semibold text-muted">
          {t("كا ما تحتاج معرفته عن تجربتك معنا, في مكان واحد")}
        </p>
      </div>

      <div className="shell">
        <div className="hidden lg:pt-8">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "الاسئلة الشائعة", href: "/help/faq" },
            ]}
          />
        </div>

        <div className="mx-auto max-w-[640px] px-4 lg:max-w-3xl lg:px-0">
          <div className="relative lg:mt-6 lg:rounded-[28px] lg:bg-white lg:p-8 lg:shadow-soft">
            <Link
              href="/help"
              aria-label={t("رجوع")}
              className="absolute start-6 top-6 hidden size-12 place-items-center rounded-full border border-line bg-white text-ink transition hover:text-brand lg:grid"
            >
              <ArrowRight className="size-5 ltr:rotate-180" strokeWidth={2.2} />
            </Link>

            <div className="hidden text-center lg:block">
              <h1 className="text-[34px] font-extrabold">{t("الاسئلة الشائعة")}</h1>
              <p className="mt-2 text-sm text-muted">
                {t("كا ما تحتاج معرفته عن تجربتك معنا, في مكان واحد")}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-gold/70 bg-white px-3 py-2.5 shadow-soft lg:mt-10 lg:mx-auto lg:max-w-2xl">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("ابحث عن سؤال...")}
                aria-label={t("ابحث في الأسئلة الشائعة")}
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-[0_14px_24px_-14px_rgba(232,69,44,0.9)]">
                <Search className="size-5" strokeWidth={2.2} />
              </span>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-extrabold">
              <span className="size-2 shrink-0 rounded-full bg-brand" />
              {t("الأسئلة الأكثر شيوعاً")}
            </div>

            <div className="mt-3 space-y-3">
              {visible.map((item) => {
                const open = openId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`card p-4 transition lg:p-5 ${open ? "bg-cream-50" : "bg-white"}`}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : item.id)}
                      className="flex w-full items-center gap-3 text-start"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-[0_12px_22px_-12px_rgba(232,69,44,0.9)]">
                        <span className="text-xl font-extrabold leading-none" aria-hidden>
                          ?
                        </span>
                      </span>
                      <span className="flex-1 text-sm font-extrabold leading-6 lg:text-base">
                        {t(item.question)}
                      </span>
                      {open ? (
                        <ChevronUp className="size-5 shrink-0 text-gold" strokeWidth={2.4} />
                      ) : (
                        <ChevronDown className="size-5 shrink-0 text-gold" strokeWidth={2.4} />
                      )}
                    </button>
                    {open ? (
                      <p className="mt-3 border-t border-line pt-3 text-sm leading-8 text-muted">
                        {t(item.answer)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">{t("لا توجد نتائج مطابقة")}</p>
              ) : null}
            </div>

            <a
              href="tel:19885"
              className="btn-brand mt-8 flex h-16 w-full rounded-[24px] text-base lg:mt-10"
            >
              {t("اذا لم تجد اجابتك تواصل معنا")}
              <Phone className="size-5 shrink-0" strokeWidth={2.1} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

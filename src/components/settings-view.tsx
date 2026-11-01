"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  Bell,
  ChevronLeft,
  CircleHelp,
  FileText,
  Info,
  LogOut,
  MapPin,
  Shield,
  ShieldCheck,
  X,
  Check,
  type LucideProps,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { Breadcrumbs, MobilePageHeader } from "@/components/ui";

type Row = {
  id: string;
  label: string;
  icon: ComponentType<LucideProps>;
  href: string;
};

const rows: Row[] = [
  { id: "help", label: "المساعدة والدعم", icon: CircleHelp, href: "/help" },
  { id: "addresses", label: "العناوين المحفوظة", icon: MapPin, href: "/addresses" },
  { id: "privacy", label: "سياسة الخصوصية", icon: Shield, href: "/help/policies?tab=privacy" },
  { id: "terms", label: "الشروط والاحكام", icon: ShieldCheck, href: "/help/policies?tab=terms" },
  { id: "data", label: "معالجة البيانات", icon: FileText, href: "/help/policies?tab=data" },
  { id: "about", label: "عن التطبيق", icon: Info, href: "/about" },
];

const NOTIFICATIONS_KEY = "nawy-notifications-v1";

export function SettingsView() {
  const router = useRouter();
  const { logout, lang, setLang, t } = useApp();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) setNotificationsOn(stored === "on");
    } catch {}
  }, []);

  const toggleNotifications = () => {
    setNotificationsOn((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(NOTIFICATIONS_KEY, next ? "on" : "off");
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!logoutOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [logoutOpen]);

  const confirmLogout = () => {
    setLogoutOpen(false);
    logout();
    router.push("/");
  };

  return (
    <div className="pb-10">
      <MobilePageHeader title={t("الاعدادات")} backHref="/profile" />

      <div className="shell">
        <div className="hidden items-center justify-between pt-8 lg:flex">
          <Breadcrumbs
            items={[
              { label: t("الرئيسية"), href: "/" },
              { label: t("حسابي"), href: "/profile" },
              { label: t("الاعدادات") },
            ]}
          />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t("العودة للملف الشخصي")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>

        <h1 className="hidden pt-5 text-[32px] font-extrabold lg:block">{t("الاعدادات")}</h1>

        <div className="mx-auto max-w-[640px]">
          <div className="flex justify-center pt-2 lg:pb-2 lg:pt-6">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1.5 shadow-soft">
              <button
                type="button"
                onClick={() => setLang("ar")}
                dir="rtl"
                className={`h-10 w-24 rounded-full text-xs font-extrabold transition ${
                  lang === "ar" ? "bg-brand text-white" : "text-ink"
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                dir="ltr"
                className={`h-10 w-24 rounded-full text-xs font-extrabold transition ${
                  lang === "en" ? "bg-brand text-white" : "text-ink"
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div className="card mt-6 p-3.5 lg:mt-8 lg:p-4">
            <div className="flex items-center gap-3 rounded-2xl bg-[#fbf4ec] px-3.5 py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-[3px_3px_0_0_rgba(32,26,22,0.9)]">
                <Bell className="size-5" strokeWidth={1.8} />
              </span>
              <span className="flex-1 text-sm font-extrabold">{t("الاشعارات")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsOn}
                aria-label={t("تشغيل الإشعارات")}
                onClick={toggleNotifications}
                className={`relative h-8 w-14 shrink-0 rounded-full p-1 transition ${
                  notificationsOn ? "bg-brand" : "bg-line"
                }`}
              >
                <span
                  className={`block size-6 rounded-full bg-white shadow transition-transform ${
                    notificationsOn ? "ltr:translate-x-6" : "rtl:-translate-x-6"
                  }`}
                />
              </button>
            </div>

            <div className="mt-2.5 space-y-2.5">
              {rows.map((row) => {
                const Icon = row.icon;
                return (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="flex w-full items-center gap-3 rounded-2xl bg-[#fbf4ec] px-3.5 py-3 text-start transition hover:bg-[#f7ece1]"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-[3px_3px_0_0_rgba(32,26,22,0.9)]">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 text-sm font-extrabold">{t(row.label)}</span>
                    <ChevronLeft className="size-4 text-ink/70 ltr:rotate-180" />
                  </Link>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#fdecef] text-sm font-extrabold text-[#d81b45] transition hover:bg-[#fbdfe5]"
          >
            <LogOut className="size-5" strokeWidth={2} />
            {t("تسجيل الخروج")}
          </button>
        </div>
      </div>

      {logoutOpen ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-ink/30 p-5 backdrop-blur-sm"
          onClick={() => setLogoutOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(event) => event.stopPropagation()}
            className="animate-float-in relative w-full max-w-[430px] rounded-[28px] bg-cream px-6 pb-7 pt-[70px] shadow-pop"
          >
            <span className="absolute -top-10 left-1/2 grid size-[80px] -translate-x-1/2 place-items-center rounded-[22px] border border-white/70 bg-gradient-to-b from-white via-[#f0e8e2] to-[#d9cfc8] text-[#cc1f3f] shadow-[0_20px_34px_-18px_rgba(40,25,15,0.7)]">
              <LogOut className="size-9" strokeWidth={1.9} />
            </span>

            <h2 id="logout-title" className="text-center text-2xl font-extrabold">
              {t("تسجيل الخروج")}
            </h2>
            <p className="mt-2 text-center text-sm text-muted">{t("هل أنت متأكد أنك تريد تسجيل خروج؟")}</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white text-sm font-extrabold text-ink shadow-soft transition hover:bg-white/70"
              >
                {t("الغاء")}
                <X className="size-4" strokeWidth={2.4} />
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#c81e43] text-sm font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(200,30,67,0.9)] transition hover:bg-[#b01839]"
              >
                {t("تأكيد")}
                <Check className="size-4" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

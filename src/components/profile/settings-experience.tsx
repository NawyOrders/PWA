"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronLeft,
  Database,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  ShieldCheck,
  X,
} from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

const menu = [
  {
    id: "support",
    label: "المساعدة والدعم",
    icon: HelpCircle,
    body: "لو محتاج مساعدة في طلبك أو عندك استفسار، كلمنا على 19885 أو من خلال صفحة التواصل، وفريقنا جاهز يساعدك يوميًا من 11 صباحًا لـ 1:30 بعد منتصف الليل.",
  },
  {
    id: "privacy",
    label: "سياسة الخصوصية",
    icon: ShieldCheck,
    body: "بنحترم خصوصيتك. بنستخدم بياناتك (الاسم، رقم الموبايل، العنوان) لتأكيد الطلب والتوصيل فقط، ومش بنشاركها مع أي طرف تالت غير مندوب التوصيل.",
  },
  {
    id: "terms",
    label: "الشروط والاحكام",
    icon: FileText,
    body: "باستخدامك ناوي أوردر، أنت موافق على شروط الخدمة وسياسة الاسترجاع. الأسعار تشمل الضريبة، ورسوم التوصيل بتظهر قبل تأكيد الطلب.",
  },
  {
    id: "data",
    label: "معالجة البيانات",
    icon: Database,
    body: "بنعالج بياناتك حسب قانون حماية البيانات المصري. تقدر تطلب حذف حسابك وبياناتك في أي وقت من خلال الدعم الفني.",
  },
  {
    id: "about",
    label: "عن التطبيق",
    icon: Info,
    body: "ناوي أوردر — أطلب أكلك المفضل أونلاين مع توصيل سريع من أقرب فرع. الإصدار 1.0.0",
  },
] as const;

export function SettingsExperience() {
  const router = useRouter();
  const { logout, locale, setLocale } = useStore();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (!logoutOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLogoutOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [logoutOpen]);

  const confirmLogout = () => {
    logout();
    setLogoutOpen(false);
    router.push("/login");
  };

  return (
    <>
      <MobilePageHeader title="الاعدادات" backHref="/profile" />

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="hidden text-4xl font-extrabold lg:block">الاعدادات</h1>
          <p className="hidden text-sm text-muted lg:mt-2 lg:block">
            تحكم في تفضيلاتك وإشعاراتك
          </p>

          <div className="mt-3 flex justify-center lg:mt-6">
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-1.5 shadow-soft">
              {(
                [
                  { id: "ar", label: "عربي" },
                  { id: "en", label: "ENG" },
                ] as const
              ).map((option) => {
                const active = locale === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLocale(option.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full px-7 py-2 text-sm font-bold transition",
                      active
                        ? "bg-brand text-white shadow-pop"
                        : "text-ink-soft hover:text-brand",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card mt-5 p-2.5 sm:p-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream/70 px-3 py-3">
              <span className="flex items-center gap-2.5 text-sm font-bold">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-line bg-white text-brand">
                  <Bell className="h-4 w-4" aria-hidden />
                </span>
                الاشعارات
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsOn}
                aria-label="تشغيل الإشعارات"
                onClick={() => setNotificationsOn((value) => !value)}
                className={cn(
                  "relative h-8 w-14 flex-none rounded-full transition",
                  notificationsOn ? "bg-brand" : "bg-line",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
                    notificationsOn ? "start-1" : "start-7",
                  )}
                />
              </button>
            </div>

            <ul className="mt-2 space-y-2">
              {menu.map((item) => {
                const Icon = item.icon;
                const expanded = open === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : item.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-cream/70 px-3 py-3 text-start transition hover:bg-cream"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-bold">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-line bg-white text-brand">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        {item.label}
                      </span>
                      <ChevronLeft
                        className={cn(
                          "h-4 w-4 flex-none text-muted transition",
                          expanded && (locale === "ar" ? "-rotate-90" : "rotate-90"),
                        )}
                        aria-hidden
                      />
                    </button>
                    {expanded ? (
                      <p className="mx-3 mt-1.5 rounded-xl bg-white/70 p-3 text-[11px] leading-6 text-muted">
                        {item.body}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full border border-brand/15 bg-brand-soft/70 text-sm font-bold text-brand transition hover:bg-brand-mist"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            تسجيل الخروج
          </button>

          <p className="mt-4 text-center text-[10px] text-muted">
            ناوي أوردر © 2026 · كل الحقوق محفوظة ·{" "}
            <Link href="/" className="font-bold text-brand hover:underline">
              الرئيسية
            </Link>
          </p>
        </div>
      </div>

      {logoutOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
          onClick={() => setLogoutOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="relative w-full max-w-sm rounded-[2rem] bg-cream px-6 pb-6 pt-12 text-center shadow-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-line bg-gradient-to-b from-white to-cream-deep text-brand shadow-soft">
              <LogOut className="h-7 w-7" aria-hidden />
            </span>
            <h2 id="logout-title" className="mt-4 text-2xl font-extrabold">
              تسجيل الخروج
            </h2>
            <p className="mt-2 text-sm text-muted">هل أنت متأكد انك تريد تسجيل الخروج؟</p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-bold text-ink-soft transition hover:bg-cream"
              >
                <X className="h-4 w-4" aria-hidden />
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-bold text-white shadow-pop transition hover:bg-brand-strong"
              >
                تأكيد
                <span aria-hidden>✓</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

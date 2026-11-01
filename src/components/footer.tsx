"use client";

import Link from "next/link";
import { Clock3, MapPin, PhoneCall } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { InstallButton } from "@/components/install-button";
import { useApp } from "@/components/providers";

const quickLinks = [
  { label: "الأكثر طلباً", href: "/categories" },
  { label: "برجر لحم", href: "/categories" },
  { label: "بيتزا", href: "/search?q=%D8%A8%D9%8A%D8%AA%D8%B2%D8%A7" },
  { label: "ساندويتشات", href: "/search?q=%D8%AA%D9%88%D8%B3%D8%AA" },
  { label: "عروض التوصيل المجاني", href: "/search?q=%D8%B9%D8%B1%D9%88%D8%B6" },
  { label: "المشروبات والحلويات", href: "/categories" },
];

const companyLinks = [
  { label: "عن ناوي أوردرز", href: "/about" },
  { label: "سياسة الخصوصية", href: "/help/policies?tab=privacy" },
  { label: "الشروط والأحكام", href: "/help/policies?tab=terms" },
  { label: "المساعدة والدعم", href: "/help" },
  { label: "تواصل معنا", href: "/help/chat" },
];

export function Footer() {
  const { t } = useApp();
  return (
    <footer className="mt-16 hidden border-t border-line bg-cream-50 lg:block">
      <div className="shell grid grid-cols-4 gap-10 py-14">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="size-12" />
            <div>
              <p className="font-display text-xl font-extrabold text-brand">{t("ناوي أوردرز")}</p>
              <p className="text-[11px] text-muted">{t("جوعك بيوصل بسرعة")}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted">
            {t("مطعم برجر وكومبو في تقدمك آمن. أوردرات طازة وتوصيل سريع، والدفع كاش أو أونلاين.")}
          </p>
          <div className="mt-6 rounded-2xl border border-line bg-white p-4">
            <p className="text-xs text-muted">{t("خدمة العملاء والطلب")}</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-extrabold text-brand">
              <PhoneCall className="size-5" />
              19885
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
              <Clock3 className="size-3.5" />
              {t("يومياً من 11 صباحاً حتى 3 بعد منتصف الليل")}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">{t("الأقسام السريعة")}</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-brand">
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-base font-bold">{t("فروعنا في مصر")}</h3>
          <ul className="mt-5 space-y-4 text-sm text-muted">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>{t("المعادي، زهراء المعادي، المعراج العلوي")}</span>
            </li>
            <li className="flex gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>{t("مدينة نصر، عباس العقاد")}</span>
            </li>
            <li className="flex gap-2">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-brand" />
              <span>{t("مواعيد العمل: يومياً 11 صباحاً - 3 صباحاً")}</span>
            </li>
          </ul>
          <div className="mt-6">
            <InstallButton />
          </div>
        </div>

        <div>
          <h3 className="text-base font-bold">{t("عن ناوي أوردرز")}</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            {companyLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="transition hover:text-brand">
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl bg-brand-soft/70 p-4 text-xs leading-6 text-brand-dark">
            {t("اطلب من خلال التطبيق واستمتع بتجربة أسرع وعروض حصرية.")}
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex items-center justify-between py-5 text-xs text-muted">
          <div className="flex items-center gap-5">
            <Link href="/profile" className="hover:text-brand">
              {t("حسابي")}
            </Link>
            <Link href="/categories" className="hover:text-brand">
              {t("الأقسام")}
            </Link>
            <Link href="/cart" className="hover:text-brand">
              {t("السلة")}
            </Link>
            <Link href="/" className="hover:text-brand">
              {t("الرئيسية")}
            </Link>
          </div>
          <p>{t("© 2026 ناوي أوردرز — جميع الحقوق محفوظة.")}</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  CircleHelp,
  Heart,
  History,
  Info,
  LogOut,
  MapPinned,
  Settings2,
  ShoppingBag,
  Star,
  type LucideProps,
} from "lucide-react";
import { brandingName } from "@/lib/branding";
import { useApp } from "@/components/providers";
import { CustomerAvatar } from "@/components/ui";

const quickLinks: { label: string; href: string; icon: React.ComponentType<LucideProps> }[] = [
  { label: "المفضلة", href: "/favorites", icon: Heart },
  { label: "طلباتي", href: "/orders", icon: ShoppingBag },
  { label: "العناوين", href: "/addresses", icon: MapPinned },
  { label: "الإشعارات", href: "/notifications", icon: Bell },
];

const accountLinks: {
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<LucideProps>;
}[] = [
  { label: "المساعدة والدعم", hint: "تواصل معنا عند الحاجة", href: "/help", icon: CircleHelp },
  { label: "الاعدادات", hint: "اللغة، الإشعارات والمزيد", href: "/settings", icon: Settings2 },
  { label: "عن التطبيق", hint: "من نحن وطرق التواصل", href: "/about", icon: Info },
];

export function ProfileView() {
  const { favorites, lang, logout, orders, points, profile, t, branding } = useApp();
  const router = useRouter();
  const storeName = brandingName(branding, lang);
  const stats = [
    { key: "favorites", label: "المفضلة", value: favorites.length, icon: Heart, tile: "bg-pink-soft text-[#e24467]" },
    { key: "orders", label: "الطلبات", value: orders.length, icon: History, tile: "bg-brand-soft text-brand" },
    { key: "points", label: "النقاط", value: points, icon: Star, tile: "bg-[#fcecc9] text-[#eaa41c]" },
  ];

  return (
    <div className="pb-8">
      <div className="shell">
        <h1 className="mb-7 hidden text-[32px] font-extrabold lg:block">{t("الملف الشخصي")}</h1>

        <div className="mx-auto max-w-[640px] space-y-4">
          <section className="motion-rise relative overflow-hidden rounded-[2rem] bg-[linear-gradient(155deg,var(--color-brand)_0%,var(--color-brand-dark)_100%)] px-5 pb-7 pt-8 text-center text-brand-contrast shadow-pop lg:px-10 lg:pb-9 lg:pt-10">
            <span className="pointer-events-none absolute -start-10 -top-16 size-44 rounded-full bg-white/10" />
            <span className="pointer-events-none absolute -end-8 bottom-2 size-32 rounded-full bg-white/10" />

            <div className="relative mx-auto w-fit">
              <CustomerAvatar
                name={t(profile.name)}
                src={profile.avatar}
                priority
                className="size-[104px] rounded-full object-cover ring-4 ring-white/90 ring-offset-2 ring-offset-transparent lg:size-[120px]"
              />
            </div>

            <p className="mt-4 text-xs font-bold text-brand-contrast/80">{t("أهلاً،")}</p>
            <h2 className="mt-0.5 text-2xl font-extrabold">{t(profile.name)}</h2>
            <p className="mt-1 text-sm text-brand-contrast/85" dir="ltr">
              {profile.phone}
            </p>

            {profile.avatar ? null : (
              <p className="mt-2 text-[11px] font-bold text-brand-contrast/75">
                {t("لسه مضافتش صورتك — اضغط «تعديل الملف الشخصي» لرفعها")}
              </p>
            )}

            <Link
              href="/profile/edit"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-white px-7 text-xs font-extrabold text-brand shadow-[0_16px_30px_-20px_rgba(0,0,0,0.6)] transition hover:brightness-95"
            >
              {t("تعديل الملف الشخصي")}
            </Link>
          </section>

          <section className="motion-stagger card grid grid-cols-3 divide-x divide-line px-2 py-5 ltr:divide-x-reverse">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.key} className="flex flex-col items-center gap-1.5 px-2">
                  <span className={`grid size-10 place-items-center rounded-full ${stat.tile}`}>
                    <Icon className="size-[18px]" strokeWidth={2} />
                  </span>
                  <span className="text-lg font-extrabold">{stat.value}</span>
                  <span className="text-[11px] text-muted">{t(stat.label)}</span>
                </div>
              );
            })}
          </section>

          <div className="motion-stagger grid grid-cols-4 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="card flex flex-col items-center gap-2.5 px-2 py-4 transition hover:-translate-y-1 hover:shadow-pop"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="text-[11px] font-extrabold">{t(link.label)}</span>
                </Link>
              );
            })}
          </div>

          <div className="motion-stagger card divide-y divide-line overflow-hidden">
            {accountLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-4 transition hover:bg-cream-50 lg:px-5"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="size-[19px]" strokeWidth={1.9} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-extrabold">{t(link.label)}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{t(link.hint)}</span>
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-ink/60 ltr:rotate-180" />
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-brand/25 bg-pink-soft/60 text-sm font-extrabold text-brand transition hover:bg-pink-soft"
          >
            <LogOut className="size-[18px]" strokeWidth={2} />
            {t("تسجيل الخروج")}
          </button>

          {storeName ? (
            <p className="pt-1 text-center text-xs font-extrabold text-muted">{storeName}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

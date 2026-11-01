"use client";

import Link from "next/link";
import {
  BookmarkCheck,
  ChevronLeft,
  Headset,
  Heart,
  LogOut,
  MapPinned,
  Settings2,
  UserRound,
  type LucideProps,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers";

type NavItem = { href: string; label: string; icon: React.ComponentType<LucideProps> };

const navItems: NavItem[] = [
  { href: "/profile", label: "الملف الشخصي", icon: UserRound },
  { href: "/orders", label: "طلباتي", icon: BookmarkCheck },
  { href: "/favorites", label: "المفضلة", icon: Heart },
  { href: "/addresses", label: "العناوين المحفوظة", icon: MapPinned },
  { href: "/settings", label: "الإعدادات", icon: Settings2 },
];

export function AccountSidebar({ active }: { active: string }) {
  const router = useRouter();
  const { logout, t } = useApp();

  const signOut = () => {
    logout();
    router.push("/");
  };

  return (
    <aside className="hidden w-full shrink-0 space-y-4 lg:sticky lg:top-24 lg:block lg:w-[320px]">
      <div className="card p-4">
        <p className="px-2 text-[11px] font-semibold text-muted">{t("إدارة الحساب")}</p>
        <div className="mt-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.href === active;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                  isActive ? "bg-brand-soft font-extrabold text-brand" : "font-bold text-ink hover:bg-cream-100"
                }`}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.9} />
                <span className="flex-1 text-start">{t(item.label)}</span>
                <ChevronLeft className="size-4 shrink-0 opacity-60 ltr:rotate-180" />
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-brand transition hover:bg-brand-soft/50"
        >
          <LogOut className="size-[18px] shrink-0" strokeWidth={1.9} />
          <span className="flex-1 text-start">{t("تسجيل الخروج")}</span>
          <ChevronLeft className="size-4 shrink-0 opacity-60 ltr:rotate-180" />
        </button>
      </div>

      <div className="card bg-brand-soft/40 p-5 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-brand shadow-soft">
          <Headset className="size-5" strokeWidth={1.9} />
        </span>
        <p className="mt-3 text-sm font-extrabold">{t("محتاج مساعدة؟")}</p>
        <p className="mt-1 text-[11px] leading-5 text-muted">{t("إحنا هنا علشان نساعدك في أي استفسار.")}</p>
        <Link href="/help" className="mt-3 inline-block text-xs font-extrabold text-brand underline underline-offset-4">
          {t("تواصل معنا")}
        </Link>
      </div>
    </aside>
  );
}

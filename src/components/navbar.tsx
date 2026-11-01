"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useApp } from "@/components/providers";

const links = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/categories", label: "الاقسام", icon: LayoutGrid },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

export function Navbar() {
  const pathname = usePathname();
  const { count, t, loggedIn, openLoginPrompt } = useApp();
  const cartActive = pathname === "/cart" || pathname.startsWith("/checkout");

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line bg-white/95 backdrop-blur lg:block">
      <div className="shell flex h-[88px] items-center">
        <div className="flex w-44 items-center justify-start">
          <Link href="/" aria-label={t("ناوي أوردرز - الرئيسية")}>
            <LogoMark className="size-14 transition-transform hover:-rotate-3" />
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center gap-10" aria-label={t("التنقل الرئيسي")}>
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href === "/profile" && !loggedIn ? "/login?next=%2Fprofile" : link.href}
                className={`relative flex items-center gap-2.5 py-8 text-[15px] font-semibold transition-colors ${
                  active ? "text-brand" : "text-ink/70 hover:text-brand"
                }`}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                {t(link.label)}
                {active ? (
                  <span className="absolute inset-x-0 bottom-3 mx-auto h-[3px] w-16 rounded-full bg-brand" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex w-44 items-center justify-end">
          <Link
            href="/cart"
            onClick={(event) => {
              if (!loggedIn) {
                event.preventDefault();
                openLoginPrompt();
              }
            }}
            className={`flex h-12 items-center gap-2.5 rounded-full px-5 text-sm font-bold transition-colors ${
              cartActive ? "bg-brand text-white" : "bg-brand-soft text-brand hover:bg-brand/15"
            }`}
          >
            <ShoppingCart className="size-5" strokeWidth={2} />
            <span>{t("السلة")} ({count})</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

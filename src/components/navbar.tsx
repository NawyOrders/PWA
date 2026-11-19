"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ClipboardList, Home, ShoppingCart, UserRound } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useApp } from "@/components/providers";
import { brandingName } from "@/lib/branding";
import { loginHref } from "@/lib/routes";

const links = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

export function Navbar() {
  const pathname = usePathname();
  const { count, t, loggedIn, openLoginPrompt, branding, lang } = useApp();
  const storeName = brandingName(branding, lang);
  const cartActive = pathname === "/cart" || pathname.startsWith("/checkout");

  return (
    <header className="motion-header sticky top-0 z-40 hidden border-b border-line bg-white/95 backdrop-blur lg:block">
      <div className="shell flex h-[88px] items-center">
        <div className="flex w-60 items-center justify-start">
          <Link
            href="/"
            aria-label={t("ناوي أوردرز - الرئيسية")}
            className="motion-press inline-flex min-w-0 items-center gap-3"
          >
            <LogoMark className="size-14 shrink-0 transition-transform duration-300 hover:-rotate-3" />
            {storeName ? (
              <span className="min-w-0 truncate font-display text-lg font-extrabold text-brand">
                {storeName}
              </span>
            ) : null}
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center gap-10" aria-label={t("التنقل الرئيسي")}>
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            // Account and orders are private: guests get the same login hand-off
            // the mobile bottom nav uses.
            const needsLogin = !loggedIn && (link.href === "/profile" || link.href === "/orders");
            return (
              <Link
                key={link.href}
                href={needsLogin ? loginHref(link.href) : link.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-2.5 py-8 text-[15px] font-semibold transition-colors ${
                  active ? "text-brand" : "text-ink/70 hover:text-brand"
                }`}
              >
                <Icon className="size-[22px] transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={active ? 2.3 : 1.8} />
                {t(link.label)}
                {active ? (
                  <span className="motion-pop absolute inset-x-0 bottom-3 mx-auto h-[3px] w-16 rounded-full bg-brand" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <LanguageToggle />
          <Link
            href="/notifications"
            aria-label={t("الإشعارات")}
            className="motion-press relative grid size-12 place-items-center rounded-full bg-brand-soft text-brand transition-colors hover:bg-brand/15"
          >
            <Bell className="size-5" />
            <span className="animate-pulse-soft absolute end-2.5 top-2.5 size-1.5 rounded-full bg-brand" />
          </Link>
          <Link
            href="/cart"
            onClick={(event) => {
              if (!loggedIn) {
                event.preventDefault();
                openLoginPrompt();
              }
            }}
            className={`motion-press flex h-12 items-center gap-2 rounded-full px-4 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              cartActive ? "bg-brand text-white" : "bg-brand-soft text-brand hover:bg-brand/15"
            }`}
          >
            <ShoppingCart className="size-5" strokeWidth={2} />
            <span>
              {t("السلة")} (<span key={count} className="motion-badge-pop inline-block">{count}</span>)
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

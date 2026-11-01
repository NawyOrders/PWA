"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

const navItems = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/categories", label: "الأقسام", icon: LayoutGrid },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useStore();
  const onCart = pathname.startsWith("/cart");

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : href === "/profile"
        ? /^\/(profile|orders|favorites|settings|notifications|addresses)/.test(pathname)
        : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-line/70 bg-white/95 backdrop-blur lg:block">
      <div className="container-page flex h-20 items-center justify-between gap-6">
        <Logo withWordmark={false} />

        <nav aria-label="التنقل الرئيسي">
          <ul className="flex items-center gap-9 xl:gap-12">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2 py-6 text-sm font-bold transition",
                      active ? "text-brand" : "text-ink-soft hover:text-brand",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" aria-hidden strokeWidth={2} />
                    <span>{item.label}</span>
                    {active ? (
                      <span className="absolute inset-x-0 bottom-2 h-[3px] rounded-full bg-brand" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href="/cart"
          aria-label={`السلة — ${count} وجبات`}
          className={cn(
            "flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition",
            onCart
              ? "bg-brand text-white shadow-pop hover:bg-brand-strong"
              : "bg-brand-soft text-brand hover:bg-brand-mist",
          )}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          <span>السلة</span>
          <span className="opacity-80">({count})</span>
        </Link>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { useApp } from "@/components/providers";

const items = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/categories", label: "الاقسام", icon: LayoutGrid },
  { href: "/cart", label: "السلة", icon: ShoppingCart },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();
  const { count, t, loggedIn, openLoginPrompt } = useApp();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white/97 pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_40px_-28px_rgba(80,40,20,0.5)] backdrop-blur lg:hidden"
      aria-label={t("التنقل السفلي")}
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-1 pt-2.5">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href === "/profile" && !loggedIn ? "/login?next=%2Fprofile" : item.href}
              onClick={(event) => {
                if (item.href === "/cart" && !loggedIn) {
                  event.preventDefault();
                  openLoginPrompt();
                }
              }}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1.5 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors ${
                active ? "text-brand" : "text-[#8b847e]"
              }`}
            >
              <span className="relative">
                <Icon className="size-[25px]" strokeWidth={active ? 2.4 : 1.7} />
                {item.href === "/cart" && count > 0 ? (
                  <span className="absolute -end-2.5 -top-2 grid size-[17px] place-items-center rounded-full bg-brand text-[9px] font-bold text-white ring-2 ring-white">
                    {count}
                  </span>
                ) : null}
              </span>
              {t(item.label)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

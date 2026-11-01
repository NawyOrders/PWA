"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

const items = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/categories", label: "الأقسام", icon: LayoutGrid },
  { href: "/cart", label: "السلة", icon: ShoppingCart },
  { href: "/profile", label: "حسابي", icon: UserRound },
];

const hiddenPrefixes = [
  "/product",
  "/login",
  "/cart/delivery",
  "/cart/branch",
  "/cart/payment",
];

export function BottomTabBar() {
  const pathname = usePathname();
  const { count } = useStore();

  if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/profile") {
      return /^\/(profile|orders|favorites|settings|notifications|addresses)/.test(pathname);
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line/70 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition",
                  active ? "text-brand" : "text-muted hover:text-brand",
                )}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" aria-hidden strokeWidth={active ? 2.3 : 1.9} />
                  {item.href === "/cart" && count > 0 ? (
                    <span className="absolute -top-1.5 -end-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                      {count}
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

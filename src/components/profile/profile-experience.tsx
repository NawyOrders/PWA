"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Flower2,
  FolderHeart,
  Heart,
  History,
  ShoppingBag,
  Star,
} from "lucide-react";
import { orders } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

const stats = [
  { key: "favorites", label: "المفضلة", icon: Heart, tone: "bg-[#fde3e0] text-brand" },
  { key: "orders", label: "الطلبات", icon: ShoppingBag, tone: "bg-brand text-white" },
  { key: "points", label: "النقاط", icon: Star, tone: "bg-sun-soft text-[#d78d0c]" },
] as const;

const shortcuts = [
  {
    href: "/favorites",
    label: "المفضلة",
    icon: FolderHeart,
    tone: "bg-brand-soft text-brand",
  },
  {
    href: "/orders",
    label: "سجل الطلبات",
    icon: History,
    tone: "bg-brand-soft text-brand",
  },
  {
    href: "/settings",
    label: "الاعدادات",
    icon: Flower2,
    tone: "bg-brand-soft text-brand",
  },
] as const;

export function ProfileExperience() {
  const { favorites } = useStore();

  const values = {
    favorites: favorites.length,
    orders: orders.length,
    points: 320,
  } as const;

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pt-5 lg:hidden">
        <span className="h-11 w-11 flex-none" aria-hidden />
        <h1 className="flex-1 text-center text-xl font-extrabold">الملف الشخصي</h1>
        <Link
          href="/notifications"
          aria-label="الإشعارات"
          className="icon-btn h-11 w-11 flex-none rounded-2xl bg-white shadow-soft"
        >
          <Bell className="h-5 w-5" aria-hidden />
        </Link>
      </div>

      <div className="container-page pb-16 pt-5 lg:pb-24 lg:pt-6">
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <div>
            <h1 className="text-4xl font-extrabold">حسابي</h1>
            <p className="mt-2 text-sm text-muted">بياناتك، طلباتك، ونقاطك في مكان واحد</p>
          </div>
          <Link href="/notifications" className="btn-ghost h-11 text-sm">
            <Bell className="h-4 w-4" aria-hidden />
            الإشعارات
          </Link>
        </div>

        <div className="mx-auto mt-2 max-w-3xl lg:mt-8">
          <section className="card relative overflow-hidden px-5 pb-8 pt-9 text-center">
            <span aria-hidden className="absolute start-6 top-9 sm:start-8 sm:top-10">
              <span className="block h-12 w-7 rotate-[35deg] rounded-[100%_0_100%_0] bg-brand sm:h-16 sm:w-9" />
              <span className="mt-1 block h-6 w-9 rotate-[12deg] rounded-[100%_0_100%_0] bg-sun sm:h-7 sm:w-12" />
            </span>

            <div className="mx-auto h-28 w-28 rounded-full border-[3px] border-brand bg-white p-1.5 shadow-soft">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <Image
                  src="/images/avatar.jpg"
                  alt="صورة جميل جمال"
                  fill
                  priority
                  sizes="112px"
                  className="object-cover object-center"
                />
              </div>
            </div>

            <h2 className="mt-4 text-2xl font-extrabold">جميل جمال</h2>
            <p dir="ltr" className="mt-1 text-sm font-semibold text-muted">
              +20102136515
            </p>

            <Link
              href="/profile/edit"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-l from-sun via-brand to-brand-deep px-7 py-2.5 text-xs font-bold text-white shadow-pop transition hover:brightness-105"
            >
              تعديل الملف الشخصي
            </Link>

            <div className="mt-7 grid grid-cols-3 gap-2">
              {stats.map((stat) => {
                const Icon = stat.icon;
                const value = values[stat.key];
                return (
                  <div key={stat.key} className="flex flex-col items-center gap-1.5">
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-full ${stat.tone}`}
                    >
                      <Icon
                        className={`h-5 w-5 ${stat.key === "points" ? "fill-current" : ""}`}
                        aria-hidden
                      />
                    </span>
                    <span className="text-lg font-extrabold">{formatNumber(value)}</span>
                    <span className="text-[11px] font-semibold text-muted">{stat.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-5 lg:grid-cols-3 lg:gap-4">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="card flex flex-col items-center gap-3 px-4 py-7 text-sm font-extrabold transition hover:-translate-y-0.5 hover:shadow-float lg:py-9"
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${item.tone}`}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

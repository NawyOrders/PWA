"use client";

import Image from "next/image";
import Link from "next/link";
import { Flower2, FolderHeart, Heart, History, ShoppingBag, Star } from "lucide-react";
import { useApp } from "@/components/providers";
import { user } from "@/lib/data";

const stats = [
  { key: "favorites", label: "المفضلة", value: 15, icon: Heart, tile: "bg-[#fde3e8] text-[#e24467]" },
  { key: "orders", label: "الطلبات", value: 8, icon: ShoppingBag, tile: "bg-[#fbdcd2] text-[#e8452c]" },
  { key: "points", label: "النقاط", value: 320, icon: Star, tile: "bg-[#fcecc9] text-[#eaa41c]" },
];

export function ProfileView() {
  const { favorites, t } = useApp();

  return (
    <div className="pb-8">
      <h1 className="px-4 pb-4 pt-6 text-center text-lg font-extrabold lg:hidden">{t("الملف الشخصي")}</h1>

      <div className="shell">
        <h1 className="mb-7 hidden text-[32px] font-extrabold lg:block">{t("الملف الشخصي")}</h1>

        <div className="mx-auto max-w-[640px] space-y-4">
          <section className="card relative overflow-hidden px-5 py-8 text-center lg:px-10 lg:py-10">
            <div className="pointer-events-none absolute -start-16 -top-24 size-56 rounded-full bg-brand-soft/60 blur-2xl" />

            <div className="relative mx-auto w-fit">
              <div className="absolute -end-7 -top-3 z-10">
                <span className="absolute end-2 top-0 block h-9 w-5 rotate-[18deg] rounded-full bg-brand" />
                <span className="absolute end-0 top-6 block h-8 w-4 rotate-[40deg] rounded-full bg-[#f6a723]" />
              </div>
              <Image
                src={user.avatar}
                alt={t(user.name)}
                width={144}
                height={144}
                priority
                className="relative size-[124px] rounded-full object-cover ring-[5px] ring-brand/80 ring-offset-4 ring-offset-white lg:size-[144px]"
              />
            </div>

            <h2 className="mt-6 text-2xl font-extrabold">{t(user.name)}</h2>
            <p className="mt-1.5 text-sm text-muted" dir="ltr">
              {user.phone}
            </p>

            <Link
              href="/profile/edit"
              className="btn-gradient mt-5 inline-flex h-10 items-center justify-center rounded-full px-7 text-xs font-bold text-white shadow-[0_16px_30px_-18px_rgba(232,69,44,0.9)] transition hover:brightness-105"
            >
              {t("تعديل الملف الشخصي")}
            </Link>

            <div className="mt-7 grid grid-cols-3 gap-2">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.key} className="flex flex-col items-center gap-1.5">
                    <span className={`grid size-11 place-items-center rounded-full ${stat.tile}`}>
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="text-sm font-extrabold">
                      {stat.key === "favorites" ? favorites.length : stat.value}
                    </span>
                    <span className="text-[11px] text-muted">{t(stat.label)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/favorites"
              className="card flex flex-col items-center gap-3 px-4 py-6 transition hover:-translate-y-1 hover:shadow-pop"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-pink-soft text-[#e24467]">
                <FolderHeart className="size-6" strokeWidth={1.7} />
              </span>
              <span className="text-sm font-bold">{t("المفضلة")}</span>
            </Link>
            <Link
              href="/orders"
              className="card flex flex-col items-center gap-3 px-4 py-6 transition hover:-translate-y-1 hover:shadow-pop"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <History className="size-6" strokeWidth={1.7} />
              </span>
              <span className="text-sm font-bold">{t("سجل الطلبات")}</span>
            </Link>
          </div>

          <Link
            href="/settings"
            className="card flex flex-col items-center gap-3 px-4 py-6 transition hover:-translate-y-1 hover:shadow-pop"
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-pink-soft text-[#e24467]">
              <Flower2 className="size-6" strokeWidth={1.7} />
            </span>
            <span className="text-sm font-bold">{t("الاعدادات")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

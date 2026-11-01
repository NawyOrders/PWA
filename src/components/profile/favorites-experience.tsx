"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { FoodCard } from "@/components/menu/food-card";
import { products } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export function FavoritesExperience() {
  const { favorites } = useStore();
  const saved = products.filter((product) => favorites.includes(product.slug));

  return (
    <>
      <MobilePageHeader title="المفضلة" backHref="/profile" />

      <div className="container-page pb-16 pt-4 lg:pb-24 lg:pt-8">
        <p className="text-sm text-muted lg:hidden">
          أطباقك المفضلة، جاهزة لطلبك القادم
        </p>

        <div className="hidden lg:block">
          <h1 className="text-4xl font-extrabold">المفضلة</h1>
          <p className="mt-2 text-sm text-muted">أطباقك المفضلة، جاهزة لطلبك القادم</p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted">
            {formatNumber(saved.length)} طبق
          </span>
          <h2 className="text-lg font-extrabold">أطباقك المفضلة</h2>
        </div>

        {saved.length === 0 ? (
          <div className="card mt-4 flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
              <Heart className="h-7 w-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-extrabold">لسه مفيش أطباق مفضلة</h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
              دوس على القلب في أي طبق علشان تلاقيه هنا بسرعة في طلبك الجاي.
            </p>
            <Link href="/categories" className="btn-brand mt-5">
              تصفح القائمة
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-4 lg:grid-cols-5 lg:gap-4">
            {saved.map((product, index) => (
              <FoodCard key={product.slug} product={product} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

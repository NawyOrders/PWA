"use client";

import { Heart } from "lucide-react";
import { useApp } from "@/components/providers";
import { ProductCard } from "@/components/product-card";
import { EmptyState, MobilePageHeader } from "@/components/ui";
import { products } from "@/lib/data";

export function FavoritesView() {
  const { favorites, t } = useApp();
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  return (
    <div className="pb-10">
      <MobilePageHeader title="المفضلة" backHref="/profile" />

      <div className="shell">
        <div className="hidden lg:block lg:pt-8">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Heart className="size-4 fill-brand text-brand" />
            {t("أطباقك المفضلة، جاهزة لطلبك القادم")}
          </p>
          <h1 className="mt-2 text-[32px] font-extrabold">{t("المفضلة")}</h1>
        </div>

        <div className="px-4 pt-1 lg:px-0 lg:pt-7">
          <p className="text-end text-xs leading-6 text-muted lg:hidden">
            {t("أطباقك المفضلة، جاهزة لطلبك القادم")}
          </p>
          <div className="mt-3 flex items-center justify-between lg:mt-5">
            <h2 className="text-lg font-extrabold lg:text-xl">{t("أطباقك المفضلة")}</h2>
            <span className="text-xs text-muted">{t("{count} طبق", { count: favoriteProducts.length })}</span>
          </div>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="mt-5 px-4 lg:px-0">
            <EmptyState
              title="مفيش أطباق في المفضلة"
              description="اضغط على القلب في أي طبق عشان تلاقيه هنا بسرعة في طلبك الجاي."
              ctaLabel="تصفح الأطباق"
              ctaHref="/categories"
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 px-4 lg:mt-6 lg:grid-cols-4 lg:gap-5 lg:px-0">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

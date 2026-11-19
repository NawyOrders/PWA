"use client";

import { Flame } from "lucide-react";
import { categoriesById, products, type CategoryId } from "@/lib/data";
import { apiConfigured } from "@/lib/api";
import { menuProduct } from "@/lib/tenant-menu";
import { useMenuCategories, useMenuItems } from "@/hooks/use-tenant-menu";
import { useApp } from "@/components/providers";
import { Breadcrumbs, MobilePageHeader } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { MenuRow } from "@/components/menu-row";
import { StoreHeader } from "@/components/store-header";

export function CategoryDetailView({ categoryId }: { categoryId: string }) {
  const { t, lang, selectedBranchId, branding } = useApp();
  const remoteCategories = useMenuCategories();
  const branchId = branding?.branches?.some((branch) => branch.branchId === selectedBranchId) ? selectedBranchId : undefined;
  const remoteItems = useMenuItems({ categoryId, branchId, pageSize: 100 });
  const localCategory = categoriesById[categoryId as CategoryId];
  const remoteCategory = remoteCategories.data.find((item) => item.id === categoryId);
  const categoryName = remoteCategory ? (lang === "ar" ? remoteCategory.nameAr : remoteCategory.nameEn) || remoteCategory.nameEn || remoteCategory.nameAr || "" : localCategory?.name || "";
  const category = { name: categoryName };
  const categoryProducts = apiConfigured() ? remoteItems.data.items.map((item) => menuProduct(item, lang, categoryId)) : products.filter((product) => product.category === categoryId);
  const popular = [...categoryProducts]
    .sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)))
    .slice(0, 2);
  const popularIds = new Set(popular.map((product) => product.id));
  const rest = categoryProducts.filter((product) => !popularIds.has(product.id));
  const countLabel = categoryProducts.length === 1 ? t("صنف") : t("أصناف");
  const heading = t("قسم «ال{name}»", { name: t(category.name) });

  return (
    <div className="pb-10">
      <MobilePageHeader title="الاقسام" backHref="/categories" />

      <div className="shell hidden lg:block lg:pt-8">
        <StoreHeader />
      </div>

      <div className="shell">
        <div className="mx-auto max-w-5xl">
          <div className="motion-header mt-2 lg:mt-8">
            <Breadcrumbs
              items={[
                { label: "الرئيسية", href: "/" },
                { label: "الأقسام", href: "/categories" },
                { label: category.name },
              ]}
            />
            <div className="flex items-center justify-between gap-3 lg:mt-4">
              <h1 className="text-lg font-extrabold lg:text-[32px]">{heading}</h1>
              <span className="shrink-0 text-xs font-semibold text-muted lg:text-sm">
                {categoryProducts.length} {countLabel}
              </span>
            </div>
          </div>

          {popular.length > 0 ? (
            <section className="mt-5 lg:mt-8">
              <h2 className="flex items-center gap-1.5 text-base font-extrabold lg:text-xl">
                {t("الأكثر طلباً")}
                <Flame className="size-4 fill-brand/20 text-brand lg:size-5" />
              </h2>
              <div className="motion-stagger mt-3 grid grid-cols-2 gap-3 lg:mt-4 lg:grid-cols-4 lg:gap-4">
                {popular.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section className="mt-5 lg:mt-7">
              <div className="motion-stagger grid gap-3 lg:grid-cols-2 lg:gap-4">
                {rest.map((product) => (
                  <MenuRow key={product.id} product={product} />
                ))}
              </div>
            </section>
          ) : null}

          {categoryProducts.length === 0 ? (
            <p className="card mt-5 px-6 py-10 text-center text-sm text-muted">{t("لا توجد أصناف حالياً.")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

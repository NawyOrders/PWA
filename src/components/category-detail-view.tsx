"use client";

import { useApp } from "@/components/providers";
import { Breadcrumbs, MobilePageHeader } from "@/components/ui";
import { MenuRow } from "@/components/menu-row";
import { StoreHeader } from "@/components/store-header";

export function CategoryDetailView({ categoryId }: { categoryId: string }) {
  const { t, categoriesById, nameOf } = useApp();
  const category = categoriesById.get(categoryId) ?? null;
  const categoryItems = category?.items ?? [];
  const countLabel = categoryItems.length === 1 ? t("صنف") : t("أصناف");
  const categoryName = category ? nameOf(category) : t("الأقسام");
  const heading = t("قسم «ال{name}»", { name: categoryName });

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
                { label: categoryName },
              ]}
            />
            <div className="flex items-center justify-between gap-3 lg:mt-4">
              <h1 className="text-lg font-extrabold lg:text-[32px]">{heading}</h1>
              <span className="shrink-0 text-xs font-semibold text-muted lg:text-sm">
                {categoryItems.length} {countLabel}
              </span>
            </div>
          </div>

          {categoryItems.length > 0 ? (
            <section className="mt-5 lg:mt-7">
              <div className="motion-stagger grid gap-3 lg:grid-cols-2 lg:gap-4">
                {categoryItems.map((item) => (
                  <MenuRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : (
            <p className="card mt-5 px-6 py-10 text-center text-sm text-muted">
              {category ? t("لا توجد أصناف حالياً.") : t("هذا القسم مش متاح في منيو المطعم دلوقتي.")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

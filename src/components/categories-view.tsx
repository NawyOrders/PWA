"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { startingPrice } from "@/lib/menu";
import { StoreHeader } from "@/components/store-header";
import { MenuImage } from "@/components/menu-image";
import { MobilePageHeader } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { useApp } from "@/components/providers";
import { brandingName } from "@/lib/branding";

const sortOptions = [
  { id: "default", label: "الترتيب الافتراضي" },
  { id: "price-asc", label: "السعر: من الأقل للأعلى" },
  { id: "price-desc", label: "السعر: من الأعلى للأقل" },
];

function CategoryTile({
  image,
  name,
  count,
  active = false,
}: {
  image: string | null;
  name: string;
  count: number;
  active?: boolean;
}) {
  const { t } = useApp();
  return (
    <>
      <span className="grid size-[68px] place-items-center rounded-full bg-peach/80 transition-colors duration-300 group-hover:bg-brand-soft">
        <MenuImage src={image} name={name} className="size-12 rounded-full" textClassName="text-[8px]" />
      </span>
      <span
        className={`mt-2.5 line-clamp-2 w-full break-words text-center text-[15px] font-extrabold leading-tight ${
          active ? "text-brand" : "text-ink"
        }`}
      >
        {name}
      </span>
      <span className="mt-1 text-[11px] font-semibold text-muted">
        {count} {t("صنف")}
      </span>
    </>
  );
}

export function CategoriesView() {
  const { t, categories, nameOf, branding, lang, tenantSlug } = useApp();
  const storeName = brandingName(branding, lang) ?? tenantSlug ?? t("ناوي أوردرز");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState("default");

  const selected = categories.find((category) => category.id === categoryId) ?? categories[0] ?? null;
  let items = selected ? [...selected.items] : [];
  if (sort === "price-asc") items = items.sort((a, b) => startingPrice(a) - startingPrice(b));
  if (sort === "price-desc") items = items.sort((a, b) => startingPrice(b) - startingPrice(a));

  return (
    <div className="pb-4">
      <MobilePageHeader title="الاقسام" />

      <div className="shell hidden lg:block lg:pt-8">
        <StoreHeader />
      </div>

      <div className="shell mt-2 lg:mt-8">
        <nav className="hidden items-center gap-1.5 text-xs text-muted lg:flex" aria-label={t("مسار التنقل")}>
          <Link href="/" className="hover:text-brand">
            {t("الرئيسية")}
          </Link>
          <ChevronLeft className="size-3.5 ltr:rotate-180" />
          <span className="font-semibold text-brand">{t("الأقسام")}</span>
        </nav>

        <div className="mt-3 hidden items-center justify-between gap-3 lg:flex">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold lg:text-[34px]">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand lg:size-11">
              <LayoutGrid className="size-5 lg:size-6" />
            </span>
            {t("الأقسام")}
          </h1>
        </div>

        {categories.length === 0 ? (
          <p className="card mt-5 px-6 py-10 text-center text-sm text-muted">
            {t("منيو المطعم فاضي حالياً.")}
          </p>
        ) : null}

        <div className="motion-stagger mt-4 grid grid-cols-2 gap-3 lg:hidden">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.id}`}
              className="group flex flex-col items-center rounded-[18px] bg-white px-3 py-4 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]"
            >
              <CategoryTile
                image={category.image}
                name={nameOf(category)}
                count={category.items.length}
              />
            </Link>
          ))}
        </div>

        <div className="motion-stagger mt-5 hidden grid-cols-7 gap-3 lg:grid">
          {categories.map((category) => {
            const active = category.id === selected?.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                aria-pressed={active}
                className={`group flex flex-col items-center rounded-[18px] bg-white px-3 py-4 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98] ${
                  active ? "ring-2 ring-inset ring-brand/60" : ""
                }`}
              >
                <CategoryTile
                  image={category.image}
                  name={nameOf(category)}
                  count={category.items.length}
                  active={active}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="shell mt-4 hidden lg:mt-10 lg:block">
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <div className="text-start">
            <h2 className="text-2xl font-extrabold">
              {selected ? nameOf(selected) : t("الأقسام")}{" "}
              <span className="text-base font-bold text-muted">
                {items.length} {t("أطباق")}
              </span>
            </h2>
          </div>

          <label className="relative">
            <SlidersHorizontal className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label={t("ترتيب الأصناف")}
              className="h-11 appearance-none rounded-full border border-line bg-white ps-11 pe-9 text-xs font-bold outline-none transition hover:border-brand/40 focus:border-brand/50"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.label)}
                </option>
              ))}
            </select>
            <ChevronLeft className="pointer-events-none absolute end-4 top-1/2 size-3.5 -translate-y-1/2 -rotate-90 text-muted" />
          </label>
        </div>

        <div className="motion-stagger mt-4 grid grid-cols-2 gap-3 lg:mt-4 lg:grid-cols-5 lg:gap-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} className="lg:p-2.5" />
          ))}
        </div>

        {items.length === 0 && selected ? (
          <p className="card mt-4 px-6 py-10 text-center text-sm text-muted">
            {t("لا توجد أصناف حالياً.")}
          </p>
        ) : null}

        <p className="mt-6 hidden text-center text-xs text-muted lg:block">
          {t("عرض {count} من {total} أطباق في قسم {category}", {
            count: items.length,
            total: selected?.items.length ?? 0,
            category: selected ? nameOf(selected) : t("الأقسام"),
          })}
        </p>
      </div>

      <div className="shell mt-8 hidden text-center text-xs text-muted lg:block">
        <span>
          {t("{count} أقسام رئيسية — كل الأصناف محضرة طازة في مطبخ {brand}", {
            count: categories.length,
            brand: storeName,
          })}
        </span>
      </div>
    </div>
  );
}

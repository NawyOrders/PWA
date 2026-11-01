"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, LayoutGrid, SlidersHorizontal } from "lucide-react";
import {
  categories,
  categoriesById,
  categoryCounts,
  desktopCategoryOrder,
  homeCategoryOrder,
  products,
  type CategoryId,
} from "@/lib/data";
import { StoreHeader } from "@/components/store-header";
import { MobilePageHeader, SectionTitle } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { MenuRow } from "@/components/menu-row";
import { useApp } from "@/components/providers";

const chips = ["الكل", "الأكثر طلباً", "العروض"];

const sortOptions = [
  { id: "popular", label: "الترتيب: الأكثر طلباً" },
  { id: "price-asc", label: "السعر: من الأقل للأعلى" },
  { id: "price-desc", label: "السعر: من الأعلى للأقل" },
];

export function CategoriesView() {
  const { t } = useApp();
  const [categoryId, setCategoryId] = useState<CategoryId>("burger");
  const [chip, setChip] = useState("الكل");
  const [sort, setSort] = useState("popular");

  const category = categoriesById[categoryId];
  const categoryItems = products.filter((product) => product.category === categoryId);
  const categoryTotal = categoryItems.length;
  let items = categoryItems;

  if (chip === "الأكثر طلباً") items = items.filter((product) => product.popular);
  if (chip === "العروض") items = items.filter((product) => product.offer);

  if (sort === "price-asc") items = [...items].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") items = [...items].sort((a, b) => b.price - a.price);
  if (sort === "popular") items = [...items].sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)));

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
          <Link href="/categories" className="hidden text-sm font-bold text-brand hover:text-brand-dark lg:block">
            {t("عرض كل الأصناف ({count})", { count: products.length })}
          </Link>
        </div>

        <div className="hide-scrollbar -mx-4 mt-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:hidden">
          {homeCategoryOrder.map((id) => {
            const item = categoriesById[id];
            const active = id === categoryId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setCategoryId(id);
                  setChip("الكل");
                }}
                className="flex w-[60px] shrink-0 flex-col items-center gap-2 text-center"
                aria-pressed={active}
              >
                <span
                  className={`grid size-[60px] place-items-center rounded-full border-2 bg-white transition ${
                    active ? "border-brand shadow-[0_10px_24px_-14px_rgba(232,69,44,0.7)]" : "border-[#ece0d4]"
                  }`}
                >
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image src={item.image} alt={t(item.name)} fill sizes="48px" className="object-cover" />
                  </span>
                </span>
                <span className={`whitespace-nowrap text-[10px] font-bold ${active ? "text-brand" : "text-ink"}`}>{t(item.name)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 hidden grid-cols-7 gap-3 lg:grid">
          {desktopCategoryOrder.map((id) => {
            const item = categoriesById[id];
            const active = id === categoryId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setCategoryId(id);
                  setChip("الكل");
                }}
                aria-pressed={active}
                className={`flex flex-col items-center rounded-2xl border-2 bg-white px-2 py-4 text-center transition hover:-translate-y-1 hover:shadow-soft ${
                  active ? "border-brand" : "border-transparent"
                }`}
              >
                <span className="relative size-14 overflow-hidden rounded-full bg-cream-50">
                  <Image src={item.image} alt={t(item.name)} fill sizes="56px" className="object-cover" />
                </span>
                <span className={`mt-3 text-sm font-bold ${active ? "text-brand" : "text-ink"}`}>{t(item.name)}</span>
                <span className="mt-0.5 text-[10px] text-muted">{categoryCounts[id] ?? 0} {t("صنف")}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shell mt-4 hidden lg:mt-10 lg:block">
        <div className="hidden items-center justify-between gap-4 lg:flex">
          <div className="text-start">
            <h2 className="text-2xl font-extrabold">
              {t(category.name)} <span className="text-base font-bold text-muted">{items.length} {t("أطباق")}</span>
            </h2>
            <p className="mt-1.5 text-sm text-muted">{t("برجر بطعم تحفة، طازة ومحضر مخصوص ليك")}</p>
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

        <div className="mt-3 flex items-center justify-between gap-3 lg:justify-start lg:gap-2">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto lg:order-2">
            {chips.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChip(item)}
                aria-pressed={chip === item}
                className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                  chip === item
                    ? "border border-brand bg-white text-brand"
                    : "border border-line bg-white text-ink/70 hover:border-brand/30"
                }`}
              >
                {t(item)}
              </button>
            ))}
          </div>
          <span className="shrink-0 text-[11px] text-muted lg:hidden">{items.length} {t("أطباق")}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-4 lg:grid-cols-5 lg:gap-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} className="lg:p-2.5" />
          ))}
        </div>

        {items.length === 0 ? (
          <p className="card mt-4 px-6 py-10 text-center text-sm text-muted">
            {t("لا توجد أطباق مطابقة لهذا الاختيار حالياً، جرّب قسم آخر.")}
          </p>
        ) : null}

        <p className="mt-6 hidden text-center text-xs text-muted lg:block">
          {t("عرض {count} من {total} أطباق في قسم {category}", {
            count: items.length,
            total: categoryTotal,
            category: t(category.name),
          })}
        </p>
      </div>

      <div className="shell mt-8 lg:hidden">
        <SectionTitle
          title="الأكثر طلباً"
          icon={<span className="text-brand">🔥</span>}
          action={{ label: "عرض الكل", href: "/categories" }}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {products
            .filter((product) => product.category === categoryId)
            .sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)))
            .slice(0, 2)
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>

        <SectionTitle title="القائمة" className="mt-7" />
        <div className="mt-3 space-y-3">
          {items.slice(0, 4).map((product) => (
            <MenuRow key={product.id} product={product} />
          ))}
        </div>
        {items.length === 0 ? <p className="text-center text-sm text-muted">{t("لا توجد أصناف حالياً.")}</p> : null}
      </div>

      <div className="shell mt-8 hidden text-center text-xs text-muted lg:block">
        <span>
          {t("{count} أقسام رئيسية — كل الأصناف محضرة طازة في مطبخ ناوي أوردرز", { count: categories.length })}
        </span>
      </div>
    </div>
  );
}

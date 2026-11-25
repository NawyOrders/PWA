"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, LayoutGrid, SlidersHorizontal } from "lucide-react";
import {
  categories as demoCategories,
  catalogCategoryOrder,
  categoriesById,
  categoryCounts,
  desktopCategoryOrder,
  products,
  type CategoryId,
} from "@/lib/data";
import { StoreHeader } from "@/components/store-header";
import { MobilePageHeader } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { useApp } from "@/components/providers";
import { apiConfigured } from "@/lib/api";
import { menuImage, menuProduct } from "@/lib/tenant-menu";
import {
  useMenuCategories,
  useMenuItems,
  useMostSold,
} from "@/hooks/use-tenant-menu";

const chips = ["الكل", "الأكثر طلباً", "العروض"];

const sortOptions = [
  { id: "popular", label: "الترتيب: الأكثر طلباً" },
  { id: "price-asc", label: "السعر: من الأقل للأعلى" },
  { id: "price-desc", label: "السعر: من الأعلى للأقل" },
];

export function CategoriesView() {
  const { t, lang, selectedBranchId, branding } = useApp();
  const remoteCategories = useMenuCategories();
  const [categoryId, setCategoryId] = useState<string>("burger");
  const [chip, setChip] = useState("الكل");
  const [sort, setSort] = useState("popular");

  useEffect(() => {
    if (apiConfigured() && remoteCategories.data.length && !remoteCategories.data.some((item) => item.id === categoryId)) setCategoryId(remoteCategories.data[0].id);
  }, [categoryId, remoteCategories.data]);
  const branchId = branding?.branches?.some((branch) => branch.branchId === selectedBranchId) ? selectedBranchId : undefined;
  const remoteItems = useMenuItems({ categoryId, branchId, pageSize: 100 });
  const categories = apiConfigured() ? remoteCategories.data.map((item) => ({ id: item.id, name: (lang === "ar" ? item.nameAr : item.nameEn) || item.nameEn || item.nameAr || "", image: menuImage(item.imageKey), count: item.itemCount ?? 0 })) : demoCategories;
  const category = categories.find((item) => item.id === categoryId) ?? categories[0] ?? {
    id: "",
    name: lang === "ar" ? "الأقسام" : "Categories",
    image: "/images/burger.webp",
    count: 0,
  };
  const categoryItems = apiConfigured() ? remoteItems.data.items.map((item) => menuProduct(item, lang, categoryId)) : products.filter((product) => product.category === categoryId);
  const categoryTotal = categoryItems.length;
  const mostSold = useMostSold(branchId, 50);
  let items = categoryItems;

  if (chip === chips[1])
    items = apiConfigured()
      ? mostSold.data
          .filter((item) => item.categoryId === categoryId)
          .map((item) => menuProduct(item, lang, categoryId))
      : items.filter((product) => product.popular);
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
        </div>

        <div className="motion-stagger mt-4 grid grid-cols-2 gap-3 lg:hidden">
          {categories.map((item) => {
            const id = item.id;
            return (
              <Link
                key={id}
                href={`/categories/${id}`}
                className="group flex flex-col items-center rounded-[18px] bg-white px-3 py-4 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98]"
              >
                <span className="grid size-[68px] place-items-center rounded-full bg-peach/80 transition-colors duration-300 group-hover:bg-brand-soft">
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image
                      src={item.image}
                      alt={t(item.name)}
                      fill
                      sizes="48px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                </span>
                <span className="mt-2.5 text-[15px] font-extrabold text-ink">{t(item.name)}</span>
                <span className="mt-1 text-[11px] font-semibold text-muted">
                  {(apiConfigured() ? item.count : categoryCounts[id] ?? 0)} {t("صنف")}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="motion-stagger mt-5 hidden grid-cols-7 gap-3 lg:grid">
          {categories.map((item) => {
            const id = item.id;
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
                className={`group flex flex-col items-center rounded-[18px] bg-white px-3 py-4 text-center shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.98] ${
                  active ? "ring-2 ring-inset ring-brand/60" : ""
                }`}
              >
                <span className="grid size-[68px] place-items-center rounded-full bg-peach/80 transition-colors duration-300 group-hover:bg-brand-soft">
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image
                      src={item.image}
                      alt={t(item.name)}
                      fill
                      sizes="48px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </span>
                </span>
                <span className={`mt-2.5 text-sm font-extrabold ${active ? "text-brand" : "text-ink"}`}>{t(item.name)}</span>
                <span className="mt-1 text-[10px] font-semibold text-muted">{(apiConfigured() ? item.count : categoryCounts[id] ?? 0)} {t("صنف")}</span>
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
                className={`motion-press h-9 shrink-0 rounded-full px-4 text-xs font-bold transition ${
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

        <div className="motion-stagger mt-4 grid grid-cols-2 gap-3 lg:mt-4 lg:grid-cols-5 lg:gap-4">
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

      <div className="shell mt-8 hidden text-center text-xs text-muted lg:block">
        <span>
          {t("{count} أقسام رئيسية — كل الأصناف محضرة طازة في مطبخ ناوي أوردرز", { count: categories.length })}
        </span>
      </div>
    </div>
  );
}

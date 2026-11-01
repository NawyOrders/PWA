"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DesktopTopBar } from "@/components/home/desktop-top-bar";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { FoodCard } from "@/components/menu/food-card";
import { MenuRow } from "@/components/menu/menu-row";
import {
  categories,
  categoriesBySlug,
  homeCategorySlugs,
  products,
  type CategorySlug,
  type ProductTag,
} from "@/lib/data";
import { cn } from "@/lib/format";

type TypeFilter = ProductTag | "all";
type SortId = "popular" | "price-asc" | "price-desc";

const typeLabels: Array<{ id: TypeFilter; label: string; tag?: ProductTag }> = [
  { id: "all", label: "الكل" },
  { id: "beef", label: "لحم", tag: "beef" },
  { id: "chicken", label: "دجاج", tag: "chicken" },
  { id: "vegetarian", label: "نباتي", tag: "vegetarian" },
  { id: "fish", label: "سمك", tag: "fish" },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[أإآ]/g, "ا").replace(/ى/g, "ي");
}

export function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<CategorySlug | "all">(() => {
    const found = categories.find(
      (item) => item.name.includes(initialQuery) || initialQuery.includes(item.name),
    );
    return found?.slug ?? "all";
  });
  const [type, setType] = useState<TypeFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [offersOnly, setOffersOnly] = useState(false);
  const [sort, setSort] = useState<SortId>("popular");

  const q = normalize(query);

  const queryMatches = products.filter((product) => {
    if (!q) return true;
    const categoryName = categoriesBySlug[product.category].name;
    const haystack = normalize(`${product.name} ${product.description} ${categoryName}`);
    return haystack.includes(q);
  });

  const results = queryMatches
    .filter((product) => category === "all" || product.category === category)
    .filter((product) => type === "all" || product.tags.includes(type))
    .filter((product) => !offersOnly || product.tags.includes("offer"))
    .filter((product) => {
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
      return product.price >= min && product.price <= max;
    })
    .sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return Number(b.tags.includes("popular")) - Number(a.tags.includes("popular"));
    });

  const resetFilters = () => {
    setCategory("all");
    setType("all");
    setMinPrice("");
    setMaxPrice("");
    setOffersOnly(false);
    setSort("popular");
  };

  const searchBox = (
    <div className="relative">
      <label htmlFor="search-page-input" className="sr-only">
        ابحث عن أي طبق
      </label>
      <input
        id="search-page-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ابحث عن أي طبق تريده..."
        autoComplete="off"
        className="h-12 w-full rounded-2xl border border-line bg-white pe-11 ps-12 text-sm shadow-soft transition placeholder:text-[#b7a79c] focus:border-brand-mist focus:outline-none focus:ring-4 focus:ring-brand/10"
      />
      <span className="pointer-events-none absolute inset-y-0 start-3 my-auto grid h-8 w-8 place-items-center text-brand">
        <Search className="h-5 w-5" aria-hidden />
      </span>
      {query ? (
        <button
          type="button"
          onClick={() => setQuery("")}
          aria-label="مسح البحث"
          className="absolute inset-y-0 end-3 my-auto grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-brand-soft hover:text-brand"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <MobilePageHeader
        title="البحث"
        backHref="/"
        action={
          <Link href="/" className="text-sm font-bold text-ink-soft transition hover:text-brand">
            إلغاء
          </Link>
        }
      />

      <div className="container-page pt-4 lg:pt-6">
        <div className="hidden lg:block">
          <DesktopTopBar search={searchBox} />
        </div>
        <div className="mt-2 lg:hidden">{searchBox}</div>

        <Breadcrumbs
          items={[{ label: "نتائج البحث" }]}
          className="mt-4 hidden lg:flex"
        />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 lg:mt-6">
          <div>
            <h1 className="text-2xl font-extrabold lg:text-3xl">
              {q ? `نتائج البحث عن «${query}»` : "كل الأطباق"}
            </h1>
            <p className="mt-1 text-sm text-muted">
              لقينا لك {results.length} أطباق — اختار البرجر اللي على مزاجك
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-brand"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              مسح الفلاتر
            </button>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-4 overflow-x-auto px-4 lg:hidden">
          {homeCategorySlugs.map((slug) => {
            const item = categoriesBySlug[slug];
            const active = category === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setCategory(active ? "all" : slug)}
                aria-pressed={active}
                className="flex w-[64px] flex-none flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "grid h-[62px] w-[62px] place-items-center rounded-full border-2 bg-white p-1.5 transition",
                    active ? "border-sun shadow-float" : "border-line",
                  )}
                >
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={56}
                    height={56}
                    className="h-full w-full rounded-full object-cover"
                  />
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    active ? "text-brand" : "text-ink-soft",
                  )}
                >
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-7">
          <aside className="hidden lg:block" aria-label="تصفية النتائج">
            <div className="card p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-extrabold">
                  <SlidersHorizontal className="h-4 w-4 text-brand" aria-hidden />
                  تصفية النتائج
                </h2>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-brand transition hover:text-brand-strong"
                >
                  مسح الكل
                </button>
              </div>

              <fieldset className="mt-5 border-t border-line pt-4">
                <legend className="text-sm font-bold">نوع البرجر</legend>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {typeLabels.map((item) => {
                    const count =
                      item.id === "all"
                        ? queryMatches.length
                        : queryMatches.filter((product) =>
                            product.tags.includes(item.tag as ProductTag),
                          ).length;
                    return (
                      <li key={item.id}>
                        <label className="flex cursor-pointer items-center justify-between gap-2 text-ink-soft">
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="type"
                              checked={type === item.id}
                              onChange={() => setType(item.id)}
                              className="h-4 w-4 accent-brand"
                            />
                            <span className={cn(item.id === "all" && "font-bold text-ink")}>
                              {item.label}
                            </span>
                          </span>
                          <span className="text-xs text-muted">{count}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <fieldset className="mt-5 border-t border-line pt-4">
                <legend className="text-sm font-bold">السعر</legend>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[11px] font-semibold text-muted">
                    من
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={minPrice}
                      onChange={(event) => setMinPrice(event.target.value)}
                      placeholder="0 جنيه"
                      className="field mt-1 h-10 px-3 py-1 text-sm"
                    />
                  </label>
                  <label className="text-[11px] font-semibold text-muted">
                    إلى
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={maxPrice}
                      onChange={(event) => setMaxPrice(event.target.value)}
                      placeholder="150 جنيه"
                      className="field mt-1 h-10 px-3 py-1 text-sm"
                    />
                  </label>
                </div>
              </fieldset>

              <label className="mt-5 flex cursor-pointer items-center justify-between border-t border-line pt-4 text-sm font-semibold text-ink-soft">
                العروض فقط
                <input
                  type="checkbox"
                  checked={offersOnly}
                  onChange={(event) => setOffersOnly(event.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
              </label>

              <button
                type="button"
                onClick={() =>
                  document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth" })
                }
                className="btn-brand mt-5 w-full text-sm"
              >
                عرض {results.length} نتائج
              </button>
            </div>
          </aside>

          <div id="search-results">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold">
                الأطباق <span className="text-sm font-bold text-muted">({results.length})</span>
              </h2>
              <label className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft shadow-soft">
                <span className="sr-only">ترتيب النتائج</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortId)}
                  aria-label="ترتيب النتائج"
                  className="bg-transparent focus:outline-none"
                >
                  <option value="popular">الترتيب: الأكثر طلبًا</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                </select>
              </label>
            </div>

            {results.length > 0 ? (
              <>
                <div className="mt-4 space-y-3 md:hidden">
                  {results.map((product) => (
                    <MenuRow key={product.slug} product={product} />
                  ))}
                </div>
                <div className="mt-4 hidden grid-cols-2 gap-4 md:grid md:grid-cols-3 xl:grid-cols-4">
                  {results.map((product, index) => (
                    <FoodCard key={product.slug} product={product} priority={index < 2} />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/70 p-10 text-center">
                <p className="text-base font-bold">مفيش نتائج للبحث ده</p>
                <p className="mt-2 text-sm text-muted">
                  جرّب كلمة تانية زي «برجر» أو «بيتزا» أو اتصفح الأقسام.
                </p>
                <Link href="/categories" className="btn-brand mt-5 text-sm">
                  تصفح الأقسام
                </Link>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-muted">
              كل النتائج من قائمة «ناوي أوردر» — بالهنا والشفا!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { startingPrice, type Item } from "@/lib/menu";
import { SearchField } from "@/components/search-field";
import { StoreHeader } from "@/components/store-header";
import { Breadcrumbs, MobilePageHeader, buttonStyles } from "@/components/ui";
import { MenuImage } from "@/components/menu-image";
import { ProductCard } from "@/components/product-card";
import { MenuRow } from "@/components/menu-row";
import { useApp } from "@/components/providers";

const sortOptions = [
  { id: "default", label: "الترتيب الافتراضي" },
  { id: "price-asc", label: "السعر: من الأقل للأعلى" },
  { id: "price-desc", label: "السعر: من الأعلى للأقل" },
];

export function SearchView({ query }: { query: string }) {
  const { t, items, categories, categoriesById, nameOf } = useApp();
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sort, setSort] = useState("default");

  const matchesQuery = (item: Item) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    const category = categoriesById.get(item.categoryId);
    const fields = [item.nameAr, item.nameEn, category?.nameAr ?? "", category?.nameEn ?? ""];
    return fields.some((field) => field.toLowerCase().includes(term));
  };

  const base = useMemo(() => items.filter(matchesQuery), [items, query, categoriesById]);

  const results = useMemo(() => {
    let list = base.filter((item) => {
      const price = startingPrice(item);
      if (priceFrom && price < Number(priceFrom)) return false;
      if (priceTo && price > Number(priceTo)) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => startingPrice(a) - startingPrice(b));
    if (sort === "price-desc") list = [...list].sort((a, b) => startingPrice(b) - startingPrice(a));
    return list;
  }, [base, priceFrom, priceTo, sort]);

  const reset = () => {
    setPriceFrom("");
    setPriceTo("");
  };

  return (
    <div className="pb-6">
      <MobilePageHeader
        title="البحث"
        action={
          <Link href="/" className="text-xs font-bold text-muted transition hover:text-brand">
            {t("إلغاء")}
          </Link>
        }
      />

      <div className="shell hidden lg:block lg:pt-8">
        <StoreHeader />
      </div>

      <div className="shell mt-1 lg:mt-8">
        <SearchField defaultValue={query} autoFocus={false} />

        <div className="motion-stagger hide-scrollbar -mx-4 mt-5 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:hidden">
          {categories.map((category) => {
            const name = nameOf(category);
            const active =
              query === category.nameAr ||
              query === category.nameEn ||
              query === name;
            return (
              <Link
                key={category.id}
                href={`/search?q=${encodeURIComponent(name)}`}
                className="flex w-[60px] shrink-0 flex-col items-center gap-2 text-center"
              >
                <span
                  className={`grid size-[60px] place-items-center rounded-full border-2 bg-white p-1 transition ${
                    active ? "border-brand shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--color-brand)_70%,transparent)]" : "border-line"
                  }`}
                >
                  <MenuImage
                    src={category.image}
                    name={name}
                    className="size-12 rounded-full"
                    textClassName="text-[7px]"
                  />
                </span>
                <span className={`whitespace-nowrap text-[10px] font-bold ${active ? "text-brand" : "text-ink"}`}>{name}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "نتائج البحث" }]} />
        </div>

        <div className="motion-header mt-4 flex items-end justify-between gap-4 lg:mt-3">
          <div className="text-start">
            <h1 className="text-xl font-extrabold leading-8 lg:text-[32px] lg:leading-normal">
              {t("نتائج البحث عن «{query}»", { query })}
            </h1>
            <p className="mt-1 hidden text-xs leading-6 text-muted lg:block lg:text-sm">
              {t("لقينا لك {count} أطباق — اختار اللي على مزاجك", { count: results.length })}
            </p>
          </div>
          <span className="shrink-0 pb-1.5 text-[11px] text-muted lg:hidden">{results.length} {t("أطباق")}</span>
        </div>

        <div className="mt-5 hidden items-center justify-between gap-3 lg:mt-7 lg:flex lg:justify-end">
          <label className="relative order-2 lg:order-2">
            <ChevronDown className="pointer-events-none absolute end-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label={t("ترتيب النتائج")}
              className="h-10 appearance-none rounded-full border border-line bg-white pe-9 ps-4 text-[11px] font-bold outline-none transition hover:border-brand/40 lg:h-11 lg:text-xs"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
          <h2 className="order-1 text-sm font-bold text-ink/60 lg:order-1 lg:text-base lg:font-extrabold lg:text-ink">
            {t("الأطباق ({count})", { count: results.length })}
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          <aside className="card hidden p-5 lg:block lg:sticky lg:top-24 motion-rise">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <SlidersHorizontal className="size-4 text-brand" />
                {t("تصفية النتائج")}
              </h2>
              <button type="button" onClick={reset} className="text-[11px] font-bold text-brand hover:text-brand-dark">
                {t("مسح الكل")}
              </button>
            </div>

            <div className="mt-5 border-t border-line pt-4">
              <h3 className="text-sm font-bold">{t("السعر")}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="relative">
                  <span className="absolute start-3 top-2 text-[9px] text-muted">{t("من")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={priceFrom}
                    onChange={(event) => setPriceFrom(event.target.value)}
                    placeholder="0"
                    aria-label={t("أقل سعر")}
                    className="h-14 w-full rounded-xl border border-line bg-white px-3 pb-1 pt-5 text-xs font-bold outline-none focus:border-brand/50"
                  />
                  <span className="absolute end-3 top-2 text-[9px] text-muted">{t("جنيه")}</span>
                </label>
                <label className="relative">
                  <span className="absolute start-3 top-2 text-[9px] text-muted">{t("إلى")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={priceTo}
                    onChange={(event) => setPriceTo(event.target.value)}
                    placeholder="150"
                    aria-label={t("أعلى سعر")}
                    className="h-14 w-full rounded-xl border border-line bg-white px-3 pb-1 pt-5 text-xs font-bold outline-none focus:border-brand/50"
                  />
                  <span className="absolute end-3 top-2 text-[9px] text-muted">{t("جنيه")}</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-contrast transition hover:bg-brand-dark"
            >
              {t("عرض {count} نتائج", { count: results.length })}
            </button>
          </aside>

          <div id="search-results" className="min-w-0 scroll-mt-24">
            <div className="motion-stagger hidden grid-cols-2 gap-4 lg:grid">
              {results.map((item) => (
                <ProductCard key={item.id} item={item} mediaClassName="aspect-[1.65/1]" />
              ))}
            </div>

            <div className="motion-stagger space-y-3 lg:hidden">
              {results.map((item) => (
                <MenuRow key={item.id} item={item} />
              ))}
            </div>

            {results.length === 0 ? (
              <div className="card px-6 py-14 text-center">
                <p className="text-lg font-extrabold">{t("مفيش نتائج للبحث ده")}</p>
                <p className="mt-2 text-sm text-muted">{t("جرّب كلمة تانية أو تصفح الأقسام.")}</p>
                <Link href="/categories" className={buttonStyles({ size: "sm", className: "mt-5" })}>
                  {t("تصفح الأقسام")}
                </Link>
              </div>
            ) : null}

            <p className="mt-6 text-center text-[11px] text-muted">
              {t("كل النتائج لـ «{query}» — بالهنا والشفا!", { query })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

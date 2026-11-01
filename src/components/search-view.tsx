"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { categoriesById, homeCategoryOrder, products, type Product } from "@/lib/data";
import { SearchField } from "@/components/search-field";
import { StoreHeader } from "@/components/store-header";
import { Breadcrumbs, MobilePageHeader, buttonStyles } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { MenuRow } from "@/components/menu-row";
import { useApp } from "@/components/providers";
import { translate } from "@/lib/i18n";

const types = ["لحم", "سمك", "دجاج", "نباتي"] as const;

const sortOptions = [
  { id: "popular", label: "ترتيب حسب: الأكثر طلباً" },
  { id: "price-asc", label: "السعر: من الأقل للأعلى" },
  { id: "price-desc", label: "السعر: من الأعلى للأقل" },
];

function matchesQuery(product: Product, query: string) {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  if (term === "عروض" || term === "offers") return Boolean(product.offer);
  if (term === "الكل" || term === "all") return true;
  const fields = [
    product.name,
    product.description,
    product.type ?? "",
    categoriesById[product.category].name,
    ...product.tags,
  ];
  return fields.some((field) => {
    const lower = field.toLowerCase();
    return lower.includes(term) || translate("en", field).toLowerCase().includes(term);
  });
}

export function SearchView({ query }: { query: string }) {
  const { t } = useApp();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [offersOnly, setOffersOnly] = useState(false);
  const [sort, setSort] = useState("popular");

  const base = useMemo(() => products.filter((product) => matchesQuery(product, query)), [query]);

  const results = useMemo(() => {
    let list = base.filter((product) => {
      if (selectedTypes.length && (!product.type || !selectedTypes.includes(product.type))) return false;
      if (priceFrom && product.price < Number(priceFrom)) return false;
      if (priceTo && product.price > Number(priceTo)) return false;
      if (offersOnly && !product.offer) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "popular") list = [...list].sort((a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)));
    return list;
  }, [base, selectedTypes, priceFrom, priceTo, offersOnly, sort]);

  const reset = () => {
    setSelectedTypes([]);
    setPriceFrom("");
    setPriceTo("");
    setOffersOnly(false);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
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

        <div className="hide-scrollbar -mx-4 mt-5 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:hidden">
          {homeCategoryOrder.map((id) => {
            const category = categoriesById[id];
            const active =
              query === category.name ||
              query === t(category.name) ||
              (id === "burger" && (query === "برجر" || query === t("برجر")));
            return (
              <Link
                key={id}
                href={`/search?q=${encodeURIComponent(category.name)}`}
                className="flex w-[60px] shrink-0 flex-col items-center gap-2 text-center"
              >
                <span
                  className={`grid size-[60px] place-items-center rounded-full border-2 bg-white transition ${
                    active ? "border-brand shadow-[0_10px_24px_-14px_rgba(232,69,44,0.7)]" : "border-[#ece0d4]"
                  }`}
                >
                  <span className="relative size-12 overflow-hidden rounded-full">
                    <Image src={category.image} alt={t(category.name)} fill sizes="48px" className="object-cover" />
                  </span>
                </span>
                <span className={`whitespace-nowrap text-[10px] font-bold ${active ? "text-brand" : "text-ink"}`}>{t(category.name)}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <Breadcrumbs items={[{ label: "الرئيسية", href: "/" }, { label: "نتائج البحث" }]} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 lg:mt-3">
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
          <aside className="card hidden p-5 lg:block lg:sticky lg:top-24">
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
              <h3 className="text-sm font-bold">{t("نوع البرجر")}</h3>
              <div className="mt-3 space-y-3">
                {types.map((type) => {
                  const count = base.filter((product) => product.type === type).length;
                  const checked = selectedTypes.includes(type);
                  return (
                    <label key={type} className="flex cursor-pointer items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-2 text-ink/80">
                        <span
                          className={`grid size-4 place-items-center rounded border transition ${
                            checked ? "border-brand bg-brand text-white" : "border-[#d8c9bc] bg-white"
                          }`}
                        >
                          {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                        {t(type)}
                      </span>
                      <span className="text-[11px] text-muted">{count}</span>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleType(type)}
                      />
                    </label>
                  );
                })}
              </div>
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

            <div className="mt-5 border-t border-line pt-4">
              <label className="flex cursor-pointer items-center justify-between text-xs text-ink/80">
                <span>{t("العروض فقط")}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`grid size-4 place-items-center rounded border transition ${
                      offersOnly ? "border-brand bg-brand text-white" : "border-[#d8c9bc] bg-white"
                    }`}
                  >
                    {offersOnly ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={offersOnly}
                    onChange={(event) => setOffersOnly(event.target.checked)}
                  />
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() =>
                document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="mt-6 flex h-11 w-full items-center justify-center rounded-full bg-brand text-xs font-bold text-white transition hover:bg-brand-dark"
            >
              {t("عرض {count} نتائج", { count: results.length })}
            </button>
          </aside>

          <div id="search-results" className="min-w-0 scroll-mt-24">
            <div className="hidden grid-cols-2 gap-4 lg:grid">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} showType mediaClassName="aspect-[1.65/1]" />
              ))}
            </div>

            <div className="space-y-3 lg:hidden">
              {results.map((product) => (
                <MenuRow key={product.id} product={product} />
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

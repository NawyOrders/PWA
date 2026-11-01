"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { FoodCard } from "@/components/menu/food-card";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/format";

type FilterId = "all" | "popular" | "offers";
type SortId = "popular" | "price-asc" | "price-desc";

const filters: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "الكل" },
  { id: "popular", label: "الأكثر طلبًا" },
  { id: "offers", label: "العروض" },
];

const sorts: Array<{ id: SortId; label: string }> = [
  { id: "popular", label: "الترتيب: الأكثر طلبًا" },
  { id: "price-asc", label: "السعر: من الأقل للأعلى" },
  { id: "price-desc", label: "السعر: من الأعلى للأقل" },
];

export function CategoryProductList({
  products,
  categoryName,
}: {
  products: Product[];
  categoryName: string;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("popular");

  const filtered = products.filter((product) => {
    if (filter === "popular") return product.tags.includes("popular");
    if (filter === "offers") return product.tags.includes("offer");
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    const aPopular = a.tags.includes("popular") ? 1 : 0;
    const bPopular = b.tags.includes("popular") ? 1 : 0;
    return bPopular - aPopular;
  });

  return (
    <section aria-labelledby="category-products" className="mt-8 lg:mt-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 id="category-products" className="text-2xl font-extrabold lg:text-3xl">
              {categoryName}
            </h2>
            <span className="text-sm font-bold text-muted">{products.length} أطباق</span>
          </div>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
            اختر الأطباق المفضلة وأضفها للسلة، وكل الأطباق بتتحضر طازة عند الطلب.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={cn("chip", filter === item.id && "chip-active")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="relative flex h-11 w-full max-w-[230px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink-soft shadow-soft">
          <SlidersHorizontal className="h-4 w-4 text-muted" aria-hidden />
          <span className="sr-only">ترتيب النتائج</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortId)}
            className="w-full appearance-none bg-transparent focus:outline-none"
            aria-label="ترتيب النتائج"
          >
            {sorts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sorted.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {sorted.map((product, index) => (
            <FoodCard key={product.slug} product={product} priority={index < 2} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-dashed border-line bg-white/60 p-8 text-center text-sm text-muted">
          مفيش أطباق في الفلتر ده دلوقتي، جرّب فلتر تاني.
        </p>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        عرض {sorted.length} من {products.length} أطباق في قسم {categoryName}
      </p>
    </section>
  );
}

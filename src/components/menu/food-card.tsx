"use client";

import Image from "next/image";
import Link from "next/link";
import { Flame, Heart, Plus } from "lucide-react";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/format";
import type { Product } from "@/lib/data";
import { useStore } from "@/lib/store";

export function FoodCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { addItem, isFavorite, toggleFavorite } = useStore();
  const saved = isFavorite(product.slug);

  return (
    <article className="card group relative flex flex-col p-2.5 transition hover:-translate-y-0.5 hover:shadow-float">
      <Link
        href={`/product/${product.slug}`}
        className="absolute inset-0 z-0 rounded-card"
        aria-label={`${product.name} — ${product.price} جنيه`}
      />

      <div className="relative overflow-hidden rounded-2xl bg-peach">
        <div className="aspect-[4/3] w-full">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 220px, (min-width: 1024px) 20vw, 45vw"
            className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(product.slug)}
          aria-label={saved ? `إزالة ${product.name} من المفضلة` : `أضف ${product.name} للمفضلة`}
          aria-pressed={saved}
          className="absolute end-2.5 top-2.5 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink shadow-sm transition hover:text-brand"
        >
          <Heart className={cn("h-[18px] w-[18px]", saved && "fill-brand text-brand")} aria-hidden />
        </button>
        {product.badge ? (
          <span className="absolute bottom-2.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-l from-sun to-brand px-3 py-1 text-[10px] font-bold text-white shadow">
            <Flame className="h-3 w-3 fill-white" aria-hidden />
            {product.badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3 text-start">
        <h3 className="text-sm font-bold sm:text-base">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted sm:text-xs">
          {product.description}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <Price value={product.price} oldValue={product.oldPrice} />
          <button
            type="button"
            onClick={() => addItem(product)}
            aria-label={`أضف ${product.name} إلى السلة`}
            className="z-20 grid h-9 w-9 place-items-center rounded-full bg-brand text-white shadow-pop transition hover:bg-brand-strong active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

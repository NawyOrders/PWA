"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/format";
import type { Product } from "@/lib/data";
import { useStore } from "@/lib/store";

export function MenuRow({ product }: { product: Product }) {
  const { addItem, isFavorite, toggleFavorite } = useStore();
  const saved = isFavorite(product.slug);

  return (
    <article className="card group relative flex items-stretch gap-3 overflow-hidden p-2.5">
      <Link
        href={`/product/${product.slug}`}
        className="absolute inset-0 z-0 rounded-card"
        aria-label={`${product.name} — ${product.price} جنيه`}
      />

      <div className="relative w-28 flex-none overflow-hidden rounded-2xl bg-peach sm:w-36 lg:w-40">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 160px, 112px"
          className="object-cover object-center transition duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-1 pe-1 text-start">
        <div className="pe-10">
          <h3 className="text-sm font-bold sm:text-base">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted sm:text-xs">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <Price value={product.price} oldValue={product.oldPrice} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => toggleFavorite(product.slug)}
        aria-label={saved ? `إزالة ${product.name} من المفضلة` : `أضف ${product.name} للمفضلة`}
        aria-pressed={saved}
        className="absolute end-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full border border-line bg-white/95 text-ink transition hover:text-brand"
      >
        <Heart className={cn("h-4 w-4", saved && "fill-brand text-brand")} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => addItem(product)}
        aria-label={`أضف ${product.name} إلى السلة`}
        className="absolute bottom-3 end-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-brand text-white shadow-pop transition hover:bg-brand-strong active:scale-95"
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>
    </article>
  );
}

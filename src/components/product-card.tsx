"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { useApp } from "@/components/providers";
import { AddButton, FavoriteButton, HotBadge, Price } from "@/components/ui";

export function ProductCard({
  product,
  className = "",
  showType = false,
  mediaClassName = "aspect-[1.18/1]",
}: {
  product: Product;
  className?: string;
  showType?: boolean;
  mediaClassName?: string;
}) {
  const { quickAdd, t } = useApp();

  return (
    <article
      className={`group relative rounded-[26px] bg-white p-2.5 pb-3 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop ${className}`}
    >
      <FavoriteButton productId={product.id} className="absolute end-4 top-4 z-20 size-10" />

      <Link href={`/product/${product.id}`} className="block">
        <div className={`relative overflow-hidden rounded-[20px] bg-peach ${mediaClassName}`}>
          <Image
            src={product.image}
            alt={t(product.name)}
            fill
            sizes="(max-width: 1024px) 45vw, 280px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          {showType && product.type ? (
            <span className="absolute end-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-muted backdrop-blur">
              {t(product.type)}
            </span>
          ) : null}
          {product.popular ? (
            <div className="absolute bottom-2 start-2">
              <HotBadge />
            </div>
          ) : null}
        </div>

        <h3 className="mt-3 text-center text-base font-bold leading-6 lg:text-lg">{t(product.name)}</h3>
        <p className="mx-auto mt-1 line-2 min-h-8 max-w-[94%] text-center text-[11px] leading-4 text-muted">
          {t(product.description)}
        </p>

        <div className="mt-2 flex min-h-11 items-center justify-start ps-1">
          <Price value={product.price} oldValue={product.oldPrice} compact />
        </div>
      </Link>

      <div className="absolute bottom-3 end-3 z-20">
        <AddButton onClick={() => quickAdd(product.id)} />
      </div>
    </article>
  );
}

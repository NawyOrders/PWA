"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { useApp } from "@/components/providers";
import { AddButton, FavoriteButton, Price } from "@/components/ui";

export function MenuRow({ product, className = "" }: { product: Product; className?: string }) {
  const { quickAdd, t } = useApp();

  return (
    <article
      className={`relative flex min-h-[128px] overflow-hidden rounded-[24px] bg-white shadow-soft transition hover:shadow-pop lg:min-h-[148px] ${className}`}
    >
      <div className="relative w-[116px] shrink-0 lg:w-[150px]">
        <Link
          href={`/product/${product.id}`}
          className="absolute inset-0 overflow-hidden bg-peach"
          aria-label={t(product.name)}
        >
          <Image
            src={product.image}
            alt={t(product.name)}
            fill
            sizes="150px"
            className="object-cover transition-transform duration-500 hover:scale-105"
          />
        </Link>
      </div>

      <Link
        href={`/product/${product.id}`}
        className="relative z-10 flex min-w-0 flex-1 flex-col justify-center py-3 pe-16 ps-3.5 text-start"
      >
        <h3 className="text-lg font-extrabold lg:text-xl">{t(product.name)}</h3>
        <p className="line-2 mt-1 max-w-[95%] text-[11px] leading-5 text-muted lg:text-xs">
          {t(product.description)}
        </p>
        <div className="mt-3">
          <Price value={product.price} oldValue={product.oldPrice} />
        </div>
      </Link>

      <FavoriteButton productId={product.id} className="absolute end-3 top-3 z-20 size-9 lg:size-10" />
      <div className="absolute bottom-3 end-3 z-20">
        <AddButton onClick={() => quickAdd(product.id)} className="size-10 lg:size-11" />
      </div>
    </article>
  );
}

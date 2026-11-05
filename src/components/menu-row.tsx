"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { useApp } from "@/components/providers";
import { AddButton, FavoriteButton, Price, QtyStepper } from "@/components/ui";

export function MenuRow({ product, className = "" }: { product: Product; className?: string }) {
  const { changeQty, lines, quickAdd, t } = useApp();
  const defaultSize = product.category === "burger" ? "ساندوتش فقط" : undefined;
  const cartLine = lines.find(
    (line) =>
      line.productId === product.id &&
      line.size === defaultSize &&
      !line.extras?.length &&
      !line.note,
  );

  return (
    <article
      className={`group relative flex min-h-[128px] overflow-hidden rounded-[24px] bg-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-pop active:scale-[0.995] lg:min-h-[148px] ${className}`}
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
            className="object-cover transition-transform duration-500 group-hover:scale-105"
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
          <Price value={product.price} />
        </div>
      </Link>

      <FavoriteButton productId={product.id} className="absolute end-3 top-3 z-20 size-9 lg:size-10" />
      <div className="absolute bottom-3 end-3 z-20">
        {!cartLine ? (
          <AddButton onClick={() => quickAdd(product.id)} className="size-10 lg:size-11" />
        ) : (
          <QtyStepper
            value={cartLine.qty}
            min={0}
            onChange={(quantity) => changeQty(cartLine.key, quantity - cartLine.qty)}
            className="gap-1 p-1 [&_button]:size-8 [&_span]:min-w-5 [&_span]:text-sm lg:[&_button]:size-9 max-[375px]:gap-0 max-[375px]:p-0 max-[375px]:[&_button]:size-6 max-[375px]:[&_span]:min-w-4 max-[375px]:[&_span]:text-xs max-[375px]:[&_svg]:size-3"
          />
        )}
      </div>
    </article>
  );
}

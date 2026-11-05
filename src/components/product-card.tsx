"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/data";
import { useApp } from "@/components/providers";
import { AddButton, FavoriteButton, HotBadge, Price, QtyStepper } from "@/components/ui";

export function ProductCard({
  product,
  className = "",
  showType = false,
  mediaClassName = "aspect-[1.4/1]",
}: {
  product: Product;
  className?: string;
  showType?: boolean;
  mediaClassName?: string;
}) {
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
      className={`group relative flex flex-col rounded-[26px] bg-white p-2.5 pb-3 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.99] ${className}`}
    >
      <FavoriteButton productId={product.id} className="absolute end-4 top-4 z-20 size-10" />

      <Link href={`/product/${product.id}`} className="flex flex-1 flex-col">
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
        </div>

        <div className="mt-2 flex min-h-7 justify-start ps-1">
          {product.popular ? (
            <HotBadge />
          ) : null}
        </div>

        <h3 className="mt-1.5 text-start text-base font-bold leading-6 lg:text-lg">
          {t(product.name)}
        </h3>
        <p className="mt-1 line-2 min-h-7 pt-0.5 text-start text-[11px] leading-4 text-muted">
          {t(product.description)}
        </p>
      </Link>

      <div className="mt-1.5 flex min-h-11 items-center justify-between gap-2 ps-1">
        {/* Most Popular cards lead with the count control, so the crossed-out
            campaign price is dropped here rather than the item price. */}
        <Price value={product.price} compact />
        {cartLine ? (
          <QtyStepper
            value={cartLine.qty}
            min={0}
            onChange={(quantity) => changeQty(cartLine.key, quantity - cartLine.qty)}
            className="gap-0.5 p-0.5 [&_button]:size-6 [&_span]:min-w-4 [&_span]:text-xs [&_svg]:size-3 max-[375px]:gap-0 max-[375px]:p-0 max-[375px]:[&_button]:size-5 max-[375px]:[&_span]:min-w-3 max-[375px]:[&_span]:text-[11px] max-[375px]:[&_svg]:size-2.5"
          />
        ) : (
          <AddButton onClick={() => quickAdd(product.id)} />
        )}
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { hasVariants, startingPrice, type Item } from "@/lib/menu";
import { useApp } from "@/components/providers";
import { AddButton, FavoriteButton, ItemMedia, Price, QtyStepper } from "@/components/ui";

export function ProductCard({
  item,
  className = "",
  mediaClassName = "aspect-[1.4/1]",
}: {
  item: Item;
  className?: string;
  mediaClassName?: string;
}) {
  const { changeQty, lines, quickAdd, nameOf, t } = useApp();
  const variantItem = hasVariants(item);
  const name = nameOf(item);
  const cartLine = variantItem
    ? undefined
    : lines.find((line) => line.productId === item.id && !line.variant && !line.note);

  return (
    <article
      className={`group relative flex flex-col rounded-[26px] bg-white p-2.5 pb-3 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop active:scale-[0.99] ${className}`}
    >
      <FavoriteButton productId={item.id} className="absolute end-4 top-4 z-20 size-10" />

      <Link href={`/product/${item.id}`} className="flex flex-1 flex-col">
        <ItemMedia
          name={item.nameAr}
          className={`relative w-full rounded-[20px] ${mediaClassName}`}
          textClassName="text-sm"
        />

        <h3 className="mt-2.5 px-1 text-start text-base font-bold leading-6 lg:text-lg">{name}</h3>
      </Link>

      <div className="mt-1.5 flex min-h-11 items-center justify-between gap-2 ps-1">
        <span className="flex items-baseline gap-1.5">
          {variantItem || item.price === null ? (
            <span className="text-[11px] font-bold text-muted">{t("من")}</span>
          ) : null}
          <Price value={startingPrice(item)} compact />
        </span>
        {variantItem ? (
          <Link
            href={`/product/${item.id}`}
            aria-label={t("اختار الحجم")}
            className="motion-press grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-contrast shadow-[0_12px_24px_-12px_color-mix(in_srgb,var(--color-brand)_90%,transparent)] transition hover:scale-105 hover:bg-brand-dark active:scale-90"
          >
            <Plus className="size-4" strokeWidth={2.4} />
          </Link>
        ) : cartLine ? (
          <QtyStepper
            value={cartLine.qty}
            min={0}
            onChange={(quantity) => changeQty(cartLine.key, quantity - cartLine.qty)}
            className="gap-0.5 p-0.5 [&_button]:size-6 [&_span]:min-w-4 [&_span]:text-xs [&_svg]:size-3 max-[375px]:gap-0.5 max-[375px]:p-0.5 max-[375px]:[&_button]:size-6 max-[375px]:[&_span]:min-w-4 max-[375px]:[&_span]:text-xs max-[375px]:[&_svg]:size-3"
          />
        ) : (
          <AddButton onClick={() => quickAdd(item.id)} />
        )}
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { hasVariants, startingPrice, type Item } from "@/lib/menu";
import { useApp } from "@/components/providers";
import { MenuImage } from "@/components/menu-image";
import { AddButton, FavoriteButton, Price, QtyStepper } from "@/components/ui";

export function MenuRow({ item, className = "" }: { item: Item; className?: string }) {
  const { changeQty, lines, quickAdd, nameOf, t } = useApp();
  const variantItem = hasVariants(item);
  const name = nameOf(item);
  // A variant item never has a single line "added by default": the cart holds
  // the variant the customer picked on the detail screen.
  const cartLine = variantItem
    ? undefined
    : lines.find((line) => line.productId === item.id && !line.variant && !line.note);

  return (
    <article
      className={`group relative flex min-h-[128px] overflow-hidden rounded-[24px] bg-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-pop active:scale-[0.995] lg:min-h-[148px] ${className}`}
    >
      <div className="relative w-[116px] shrink-0 lg:w-[150px]">
        <Link
          href={`/product/${item.id}`}
          className="absolute inset-0 block"
          aria-label={name}
        >
          <MenuImage src={item.image} name={name} className="absolute inset-0" textClassName="text-xs" />
        </Link>
      </div>

      <Link
        href={`/product/${item.id}`}
        className="relative z-10 flex min-w-0 flex-1 flex-col justify-center py-3 pe-16 ps-3.5 text-start"
      >
        <h3 className="text-lg font-extrabold lg:text-xl">{name}</h3>
        <div className="mt-3 flex items-baseline gap-1.5">
          {variantItem || item.price === null ? (
            <span className="text-[11px] font-bold text-muted">{t("من")}</span>
          ) : null}
          <Price value={startingPrice(item)} />
        </div>
      </Link>

      <FavoriteButton productId={item.id} className="absolute end-3 top-3 z-20 size-9 lg:size-10" />
      <div className="absolute bottom-3 end-3 z-20">
        {variantItem ? (
          <Link
            href={`/product/${item.id}`}
            aria-label={t("اختار الحجم")}
            className="motion-press grid size-10 place-items-center rounded-full bg-brand text-brand-contrast shadow-[0_12px_24px_-12px_color-mix(in_srgb,var(--color-brand)_90%,transparent)] transition hover:scale-105 hover:bg-brand-dark active:scale-90 lg:size-11"
          >
            <Plus className="size-5" strokeWidth={2.4} />
          </Link>
        ) : cartLine ? (
          <QtyStepper
            value={cartLine.qty}
            min={0}
            onChange={(quantity) => changeQty(cartLine.key, quantity - cartLine.qty)}
            className="gap-1 p-1 [&_button]:size-8 [&_span]:min-w-5 [&_span]:text-sm lg:[&_button]:size-9 max-[375px]:gap-0.5 max-[375px]:p-0.5 max-[375px]:[&_button]:size-7 max-[375px]:[&_span]:min-w-4 max-[375px]:[&_span]:text-xs max-[375px]:[&_svg]:size-3"
          />
        ) : (
          <AddButton onClick={() => quickAdd(item.id)} className="size-10 lg:size-11" />
        )}
      </div>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/data";
import { hasVariants, resolveVariantPrice, startingPrice } from "@/lib/menu";
import { useApp } from "@/components/providers";
import { StoreHeader } from "@/components/store-header";
import { MenuImage } from "@/components/menu-image";
import {
  buttonStyles,
  EmptyState,
  FavoriteButton,
  MobilePageHeader,
  Price,
} from "@/components/ui";

export function ProductDetail({ productId }: { productId: string }) {
  const { addItem, t, itemsById, categoriesById, nameOf } = useApp();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(0);

  const item = itemsById.get(productId);

  if (!item) {
    return (
      <div className="pb-10">
        <MobilePageHeader title="تفاصيل الوجبة" backHref="/" />
        <div className="shell mt-4 lg:mt-10">
          <EmptyState
            title="الصنف مش موجود"
            description="هذا الصنف مش متاح في منيو المطعم دلوقتي."
            ctaLabel="تصفح الأصناف"
            ctaHref="/categories"
          />
        </div>
      </div>
    );
  }

  const category = categoriesById.get(item.categoryId);
  const categoryName = category ? nameOf(category) : t("المنيو");
  const name = nameOf(item);
  const variantItem = hasVariants(item);
  const variantPrice = resolveVariantPrice(item, selectedVariant);
  const unitPrice = variantPrice ?? startingPrice(item);
  const canAdd = selectedQuantity > 0 && (!variantItem || variantPrice !== null);
  const total = unitPrice * selectedQuantity;

  const addToCart = () => {
    if (!canAdd) return;
    addItem(item.id, {
      qty: selectedQuantity,
      variant: variantItem ? (selectedVariant ?? undefined) : undefined,
      note,
    });
    setSelectedQuantity(0);
    setSelectedVariant(null);
    setNote("");
  };

  return (
    <div className="pb-36 lg:pb-0">
      <MobilePageHeader title="تفاصيل الوجبة" backHref="/" />

      <div className="shell hidden lg:block lg:pt-8">
        <StoreHeader />
      </div>

      <div className="shell mt-2 lg:mt-7">
        <div className="hidden items-center justify-between lg:flex">
          <nav className="flex items-center gap-1.5 text-xs text-muted" aria-label={t("مسار التنقل")}>
            <Link href="/" className="hover:text-brand">
              {t("الرئيسية")}
            </Link>
            <ChevronLeft className="size-3.5 ltr:rotate-180" />
            <Link href={`/categories/${item.categoryId}`} className="hover:text-brand">
              {categoryName}
            </Link>
            <ChevronLeft className="size-3.5 ltr:rotate-180" />
            <span className="font-semibold text-brand">{name}</span>
          </nav>
          <Link href="/categories" className="text-sm font-bold text-muted transition hover:text-brand">
            {t("متابعة التصفح")}
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:mt-6 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-6">
          <div className="order-1">
            <div className="motion-fade relative aspect-[2.1/1] overflow-hidden rounded-[24px] bg-peach shadow-soft lg:aspect-[1.55/1] lg:rounded-[30px]">
              <MenuImage
                src={item.image}
                name={name}
                className="absolute inset-0"
                textClassName="text-2xl lg:text-3xl"
              />
              <FavoriteButton productId={item.id} className="absolute end-4 top-4 size-11" />
            </div>

            <div className="mt-4 hidden lg:block">
              <h1 className="text-[30px] font-extrabold leading-tight">{name}</h1>
              <div className="mt-3 flex items-baseline gap-1.5">
                {variantItem && selectedVariant === null ? (
                  <span className="text-[11px] font-bold text-muted">{t("من")}</span>
                ) : null}
                <Price value={unitPrice} size="lg" />
              </div>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3 lg:hidden">
              <h1 className="text-xl font-extrabold">{name}</h1>
              <span className="flex shrink-0 items-baseline gap-1">
                {variantItem && selectedVariant === null ? (
                  <span className="text-[10px] font-bold text-muted">{t("من")}</span>
                ) : null}
                <Price value={unitPrice} size="sm" />
              </span>
            </div>
          </div>

          <div className="order-2 space-y-3 lg:space-y-4">
            <div className="motion-rise card p-4 lg:p-6">
              {variantItem ? (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{t("اختار الحجم")}</h3>
                    <span className="text-[10px] text-muted">{t("مطلوب · اختار واحد")}</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:mt-3">
                    {item.variants.map((variant) => {
                      const active = selectedVariant === variant.key;
                      return (
                        <label
                          key={variant.key}
                          className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border-2 px-4 py-3 transition ${
                            active ? "border-brand bg-brand-soft/45" : "border-line bg-white hover:border-brand/30"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-bold">
                              <span
                                className={`grid size-4 place-items-center rounded-full border-2 ${
                                  active ? "border-brand" : "border-line-soft"
                                }`}
                              >
                                {active ? <span className="size-2 rounded-full bg-brand" /> : null}
                              </span>
                              {variant.key}
                            </span>
                            <span className="text-[11px] font-bold text-brand">
                              {formatPrice(variant.price)} {t("جنيه")}
                            </span>
                          </span>
                          <input
                            type="radio"
                            name="variant"
                            className="sr-only"
                            checked={active}
                            onChange={() => setSelectedVariant(variant.key)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">{t("أي ملاحظات على طلبك؟")}</h3>
                  <span className="text-[10px] text-muted">{t("اختياري")}</span>
                </div>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 200))}
                  rows={3}
                  placeholder={t("مثال: من غير بصل، والصوص على جنب...")}
                  className="mt-2 w-full resize-none rounded-xl border border-line bg-cream-50 px-4 py-3 text-xs leading-6 outline-none transition placeholder:text-muted focus:border-brand/40"
                />
                <p className="mt-1 text-end text-[10px] text-muted">{note.length} / 200</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">{t("الكمية")}</span>
                  <div className="inline-flex items-center gap-1 rounded-full border border-line p-1">
                    <button
                      type="button"
                      aria-label={t("زيادة الكمية")}
                      disabled={selectedQuantity >= 20}
                      onClick={() => setSelectedQuantity((quantity) => Math.min(20, quantity + 1))}
                      className="grid size-8 place-items-center rounded-full border border-brand/30 bg-brand-soft text-brand"
                    >
                      <Plus className="size-4" />
                    </button>
                    <span data-testid="selected-quantity" className="w-6 text-center text-sm font-extrabold">
                      {selectedQuantity}
                    </span>
                    <button
                      type="button"
                      aria-label={t("إنقاص الكمية")}
                      disabled={selectedQuantity === 0}
                      onClick={() => setSelectedQuantity((quantity) => Math.max(0, quantity - 1))}
                      className="grid size-8 place-items-center rounded-full transition hover:bg-cream"
                    >
                      <Minus className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-[10px] text-muted">{t("الإجمالي")}</p>
                  <Price value={total} />
                </div>
              </div>

              <div className="mt-4 hidden lg:block">
                <button
                  type="button"
                  disabled={!canAdd}
                  onClick={addToCart}
                  className={buttonStyles({ block: true })}
                >
                  <ShoppingCart className="size-4" />
                  {t("أضف إلى السلة")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="motion-nav-in fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/97 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-22px_color-mix(in_srgb,var(--color-cocoa)_50%,transparent)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold">{t("الكمية")}</span>
            <div className="inline-flex items-center gap-1 rounded-full border border-line p-1">
              <button
                type="button"
                aria-label={t("زيادة الكمية")}
                disabled={selectedQuantity >= 20}
                onClick={() => setSelectedQuantity((quantity) => Math.min(20, quantity + 1))}
                className="grid size-8 place-items-center rounded-full bg-brand text-brand-contrast"
              >
                <Plus className="size-4" />
              </button>
              <span data-testid="selected-quantity" className="w-6 text-center text-sm font-extrabold">
                {selectedQuantity}
              </span>
              <button
                type="button"
                aria-label={t("إنقاص الكمية")}
                disabled={selectedQuantity === 0}
                onClick={() => setSelectedQuantity((quantity) => Math.max(0, quantity - 1))}
                className="grid size-8 place-items-center rounded-full bg-cream-50"
              >
                <Minus className="size-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={!canAdd}
            onClick={addToCart}
            className="btn-brand motion-press mt-2.5 flex h-12 w-full items-center justify-between px-5 text-sm disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              {t("أضف إلى السلة")}
            </span>
            <span className="text-sm font-extrabold">
              {formatPrice(total)} {t("جنيه")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

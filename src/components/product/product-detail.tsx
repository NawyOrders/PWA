"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Check, Clock, Flame, Heart, Info, ShoppingCart } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Price } from "@/components/ui/price";
import {
  breadOptions,
  extraOptions,
  type Product,
} from "@/lib/data";
import { cn, formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export function ProductDetail({
  product,
  categoryName,
}: {
  product: Product;
  categoryName: string;
}) {
  const { addItem, isFavorite, toggleFavorite } = useStore();
  const [bread, setBread] = useState(breadOptions[0].id);
  const [extras, setExtras] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const saved = isFavorite(product.slug);

  const breadExtra = breadOptions.find((option) => option.id === bread)?.extra ?? 0;
  const extrasTotal = extras.reduce(
    (sum, id) => sum + (extraOptions.find((option) => option.id === id)?.price ?? 0),
    0,
  );
  const unitPrice = product.price + breadExtra + extrasTotal;
  const total = unitPrice * qty;

  const toggleExtra = (id: string) => {
    setExtras((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const addToCart = () => {
    addItem(product, {
      qty,
      unitPrice,
      extras: extras.map(
        (id) => extraOptions.find((option) => option.id === id)?.name ?? id,
      ),
      notes: notes.trim() || undefined,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2600);
  };

  const meta = (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink-soft">
      {product.prepTime ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft">
          <Clock className="h-3.5 w-3.5 text-brand" aria-hidden />
          {product.prepTime}
        </span>
      ) : null}
      {product.calories ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft">
          <Flame className="h-3.5 w-3.5 text-sun" aria-hidden />
          {product.calories} كالوري
        </span>
      ) : null}
    </div>
  );

  const allergyNote = (
    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-[11px] leading-5 text-ink-soft">
      <Info className="mt-0.5 h-4 w-4 flex-none text-brand" aria-hidden />
      يحتوي على السمك والجلوتين. لو عندك حساسية لاي مكون اكتبها لنا في الملاحظات وهنراعيها.
    </p>
  );

  return (
    <>
      <MobilePageHeader title="تفاصيل الوجبة" backHref={`/categories/${product.category}`} />

      <div className="container-page pb-28 pt-3 lg:pb-0 lg:pt-6">
        <Breadcrumbs
          items={[
            { label: "الأقسام", href: "/categories" },
            { label: categoryName, href: `/categories/${product.category}` },
            { label: product.name },
          ]}
          className="hidden lg:flex"
        />

        <div className="mt-3 grid gap-6 lg:mt-6 lg:grid-cols-2 lg:items-start lg:gap-12">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-peach shadow-soft">
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 580px, 100vw"
                className="object-cover object-center"
              />
              <button
                type="button"
                onClick={() => toggleFavorite(product.slug)}
                aria-label={saved ? "إزالة من المفضلة" : "أضف إلى المفضلة"}
                aria-pressed={saved}
                className="absolute end-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/95 text-ink shadow-soft transition hover:text-brand"
              >
                <Heart
                  className={cn("h-5 w-5", saved && "fill-brand text-brand")}
                  aria-hidden
                />
              </button>
              {product.badge ? (
                <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-sun to-brand px-3 py-1.5 text-[11px] font-bold text-white shadow">
                  <Flame className="h-3.5 w-3.5 fill-white" aria-hidden />
                  {product.badge}
                </span>
              ) : null}
            </div>

            <div className="mt-5 hidden lg:block">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-extrabold">{product.name}</h1>
                <Price value={product.price} oldValue={product.oldPrice} size="lg" />
              </div>
              <p className="mt-2 text-sm leading-7 text-muted">{product.description}</p>
              {meta}
              {allergyNote}
            </div>
          </div>

          <div>
            <div className="lg:hidden">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-extrabold">{product.name}</h1>
                <Price value={product.price} oldValue={product.oldPrice} />
              </div>
              <p className="mt-2 text-xs leading-6 text-muted">{product.description}</p>
              {meta}
            </div>

            <div className="card mt-4 p-4 sm:p-6 lg:mt-0">
              <div className="text-start">
                <h2 className="text-lg font-extrabold">خطط طلبك على مزاجك</h2>
                <p className="mt-1 text-xs text-muted">اختار وجبتك وإضافاتك المفضلة</p>
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold">اختار وجبتك</legend>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {breadOptions.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition",
                        bread === option.id
                          ? "border-brand bg-brand-soft/50"
                          : "border-line bg-white hover:border-brand-mist",
                      )}
                    >
                      <span className="text-sm font-bold">{option.name}</span>
                      <span className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                        {option.extra > 0 ? `+${option.extra} جنيه` : `${option.price} جنيه`}
                        <input
                          type="radio"
                          name="bread"
                          value={option.id}
                          checked={bread === option.id}
                          onChange={() => setBread(option.id)}
                          className="h-4 w-4 accent-brand"
                        />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mt-5">
                <legend className="text-sm font-bold">
                  إضافات تحبها <span className="font-normal text-muted">· اختياري</span>
                </legend>
                <div className="mt-3 space-y-2.5">
                  {extraOptions.map((option) => (
                    <label
                      key={option.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition",
                        extras.includes(option.id)
                          ? "border-brand bg-brand-soft/40"
                          : "border-line bg-white hover:border-brand-mist",
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={extras.includes(option.id)}
                          onChange={() => toggleExtra(option.id)}
                          className="h-4 w-4 accent-brand"
                        />
                        {option.name}
                      </span>
                      <span className="text-[11px] font-semibold text-brand">
                        +{option.price} جنيه
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5">
                <label htmlFor="order-notes" className="text-sm font-bold">
                  أي ملاحظات على طلبك؟
                </label>
                <textarea
                  id="order-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value.slice(0, 200))}
                  rows={3}
                  placeholder="مثال: من غير بصل، والصوص على جنب..."
                  className="field mt-2 resize-none"
                />
                <p className="mt-1 text-end text-[10px] text-muted">{notes.length} / 200</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <QtyStepper value={qty} onChange={setQty} />
                <div className="text-end">
                  <p className="text-[11px] font-semibold text-muted">الإجمالي</p>
                  <Price value={total} size="md" />
                </div>
              </div>

              <button
                type="button"
                onClick={addToCart}
                className="btn-brand mt-4 hidden w-full lg:flex"
              >
                {added ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden />
                    تمت الإضافة إلى السلة
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" aria-hidden />
                    أضف إلى السلة
                  </>
                )}
              </button>
            </div>

            <div className="lg:hidden">{allergyNote}</div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <QtyStepper value={qty} onChange={setQty} />
          <button
            type="button"
            onClick={addToCart}
            className="btn-brand h-12 flex-1 justify-between px-4 text-sm"
          >
            <span className="flex items-center gap-2">
              {added ? (
                <Check className="h-5 w-5" aria-hidden />
              ) : (
                <ShoppingCart className="h-5 w-5" aria-hidden />
              )}
              {added ? "تمت الإضافة" : "أضف إلى السلة"}
            </span>
            <span>{formatNumber(total)} جنيه</span>
          </button>
        </div>
      </div>

      <div
        aria-live="polite"
        className={cn(
          "fixed bottom-24 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-white shadow-2xl transition-all duration-300 lg:bottom-8",
          added ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <Check className="h-4 w-4 text-success" aria-hidden />
        {product.name} أضيفت للسلة
        <Link href="/cart" className="text-sun underline-offset-4 hover:underline">
          عرض السلة
        </Link>
      </div>
    </>
  );
}

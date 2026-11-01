"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronLeft, Info, Minus, Plus, ShoppingCart } from "lucide-react";
import { categoriesById, formatPrice, type Product } from "@/lib/data";
import { useApp } from "@/components/providers";
import { StoreHeader } from "@/components/store-header";
import { Button, FavoriteButton, HotBadge, MobilePageHeader, Price } from "@/components/ui";

const sizes = [
  { id: "sandwich", label: "ساندوتش فقط", extra: 0, hint: "ساندوتش برجر طازة" },
  { id: "combo", label: "كومبو", extra: 45, hint: "ساندوتش + بطاطس + مشروب" },
];

const extrasList = [
  { id: "cheese", label: "شريحة جبنة", price: 10 },
  { id: "garlic", label: "صوص تومية إضافي", price: 15 },
  { id: "fries", label: "بطاطس صغيرة", price: 25 },
];

export function ProductDetail({ product }: { product: Product }) {
  const { addItem, t } = useApp();
  const [sizeId, setSizeId] = useState("sandwich");
  const [extras, setExtras] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const customizable = product.category === "burger";
  const size = customizable ? (sizes.find((item) => item.id === sizeId) ?? sizes[0]) : null;
  const extrasPrice = customizable
    ? extras.reduce((total, id) => total + (extrasList.find((item) => item.id === id)?.price ?? 0), 0)
    : 0;
  const unitPrice = product.price + (size?.extra ?? 0) + extrasPrice;
  const total = unitPrice * qty;
  const category = categoriesById[product.category];

  const selectedExtras = useMemo(
    () =>
      customizable
        ? extras.map((id) => extrasList.find((item) => item.id === id)?.label ?? "").filter(Boolean)
        : [],
    [customizable, extras],
  );

  const addToCart = () => {
    addItem(product.id, {
      qty,
      price: unitPrice,
      size: size?.label,
      extras: customizable ? selectedExtras : undefined,
      note,
    });
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
            <Link href="/categories" className="hover:text-brand">
              {t(category.name)}
            </Link>
            <ChevronLeft className="size-3.5 ltr:rotate-180" />
            <span className="font-semibold text-brand">{t(product.name)}</span>
          </nav>
          <Link href="/categories" className="text-sm font-bold text-muted transition hover:text-brand">
            {t("متابعة التصفح")}
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:mt-6 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-6">
          <div className="order-1">
            <div className="relative aspect-[2.1/1] overflow-hidden rounded-[24px] bg-peach shadow-soft lg:aspect-[1.55/1] lg:rounded-[30px]">
              <Image
                src={product.image}
                alt={t(product.name)}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
              <FavoriteButton productId={product.id} className="absolute end-4 top-4 size-11" />
              <div className="absolute start-4 top-4 lg:hidden">
                <HotBadge label={product.popular ? "الأكثر طلباً" : category.name} />
              </div>
            </div>

            <div className="mt-4 hidden lg:block">
              <HotBadge label={product.popular ? "الأكثر طلباً" : category.name} />
              <h1 className="mt-3 text-[30px] font-extrabold leading-tight">{t(product.name)}</h1>
              <p className="mt-2 text-sm leading-7 text-muted">{t(product.description)}</p>
              <div className="mt-3 flex justify-start">
                <Price value={total} size="lg" oldValue={product.oldPrice} />
              </div>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3 lg:hidden">
              <div>
                <h1 className="text-xl font-extrabold">{t(product.name)}</h1>
                <p className="mt-1 text-xs leading-6 text-muted">{t(product.description)}</p>
              </div>
              <Price value={unitPrice} size="sm" className="shrink-0" />
            </div>

            <div className="mt-4 hidden items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-xs leading-6 text-muted lg:flex">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream-100 text-brand">
                <Info className="size-4" />
              </span>
              <p>
                {t("يحتوي على السمك والجلوتين. لو عندك حساسية من أي مكون، اكتب لنا في الملاحظات وهنحضره على مزاجك.")}
              </p>
            </div>
          </div>

          <div className="order-2 space-y-3 lg:space-y-4">
            <div className="card p-4 lg:p-6">
              <div className="hidden text-center lg:block">
                <h2 className="text-xl font-extrabold">{t("خطط طلبك على مزاجك")}</h2>
                {customizable ? (
                  <p className="mt-1 text-xs text-muted">{t("اختار وجبتك وإضافاتك المفضلة")}</p>
                ) : null}
              </div>

              {customizable ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{t("اختار وجبتك")}</h3>
                    <span className="text-[10px] text-muted">{t("مطلوب · اختار واحد")}</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:mt-3">
                    {sizes.map((item) => {
                      const active = sizeId === item.id;
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border-2 px-4 py-3 transition ${
                            active ? "border-brand bg-brand-soft/45" : "border-line bg-white hover:border-brand/30"
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-bold">
                              <span
                                className={`grid size-4 place-items-center rounded-full border-2 ${
                                  active ? "border-brand" : "border-[#d8c9bc]"
                                }`}
                              >
                                {active ? <span className="size-2 rounded-full bg-brand" /> : null}
                              </span>
                              {t(item.label)}
                            </span>
                            <span className="text-[11px] font-bold text-brand">
                              {item.extra
                                ? `+ ${item.extra} ${t("جنيه")}`
                                : `${formatPrice(product.price)} ${t("جنيه")}`}
                            </span>
                          </span>
                          <span className="ps-6 text-[10px] text-muted">{t(item.hint)}</span>
                          <input
                            type="radio"
                            name="size"
                            className="sr-only"
                            checked={active}
                            onChange={() => setSizeId(item.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {customizable ? (
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">{t("إضافات على مزاجك")}</h3>
                    <span className="text-[10px] text-muted">{t("اختياري · اختر اللي يعجبك")}</span>
                  </div>
                  <div className="mt-2.5 space-y-2 lg:space-y-2.5">
                    {extrasList.map((item) => {
                      const active = extras.includes(item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 transition ${
                            active ? "border-brand/40 bg-brand-soft/40" : "border-line bg-white hover:border-brand/25"
                          }`}
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <span
                              className={`grid size-4 place-items-center rounded border ${
                                active ? "border-brand bg-brand text-white" : "border-[#d8c9bc] bg-white"
                              }`}
                            >
                              {active ? <Check className="size-3" strokeWidth={3} /> : null}
                            </span>
                            {t(item.label)}
                          </span>
                          <span className="text-[11px] font-bold text-brand">+ {item.price} {t("جنيه")}</span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={active}
                            onChange={() =>
                              setExtras((current) =>
                                current.includes(item.id)
                                  ? current.filter((id) => id !== item.id)
                                  : [...current, item.id],
                              )
                            }
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

              <div className="mt-4 hidden items-center justify-between border-t border-line pt-4 lg:flex">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted">{t("الكمية")}</span>
                  <div className="inline-flex items-center gap-1 rounded-full border border-line p-1">
                    <button
                      type="button"
                      aria-label={t("زيادة الكمية")}
                      onClick={() => setQty((value) => Math.min(20, value + 1))}
                      className="grid size-8 place-items-center rounded-full border border-brand/30 bg-brand-soft text-brand"
                    >
                      <Plus className="size-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-extrabold">{qty}</span>
                    <button
                      type="button"
                      aria-label={t("إنقاص الكمية")}
                      onClick={() => setQty((value) => Math.max(1, value - 1))}
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
                <Button block onClick={addToCart}>
                  <ShoppingCart className="size-4" />
                  {t("أضف إلى السلة")}
                </Button>
              </div>
            </div>

            <div className="card flex items-start gap-3 p-4 text-xs leading-6 text-muted lg:hidden">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cream-100 text-brand">
                <Info className="size-4" />
              </span>
              <p>
                {t("يحتوي على السمك والجلوتين. لو عندك حساسية من أي مكون، اكتب لنا في الملاحظات وهنحضره على مزاجك.")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/97 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_-22px_rgba(80,40,20,0.5)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold">{t("الكمية")}</span>
            <div className="inline-flex items-center gap-1 rounded-full border border-line p-1">
              <button
                type="button"
                aria-label={t("زيادة الكمية")}
                onClick={() => setQty((value) => Math.min(20, value + 1))}
                className="grid size-8 place-items-center rounded-full bg-brand text-white"
              >
                <Plus className="size-4" />
              </button>
              <span className="w-6 text-center text-sm font-extrabold">{qty}</span>
              <button
                type="button"
                aria-label={t("إنقاص الكمية")}
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                className="grid size-8 place-items-center rounded-full bg-cream-50"
              >
                <Minus className="size-4" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={addToCart}
            className="btn-brand mt-2.5 flex h-12 w-full items-center justify-between px-5 text-sm"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              {t("أضف إلى السلة")}
            </span>
            <span className="text-sm font-extrabold">{formatPrice(total)} {t("جنيه")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

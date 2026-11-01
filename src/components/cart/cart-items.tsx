"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Pencil, ShoppingBag, Trash2 } from "lucide-react";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { productsBySlug } from "@/lib/data";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export function CartItems({ showNotes = true }: { showNotes?: boolean }) {
  const { lines, count, removeLine, setQty } = useStore();
  const [notes, setNotes] = useState("");

  if (lines.length === 0) {
    return (
      <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
          <ShoppingBag className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">سلتك فاضية دلوقتي</h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted">
          ضيف أطباقك المفضلة وابدأ طلبك، وهنوصلك كل حاجة سخنة وطازة.
        </p>
        <Link href="/categories" className="btn-brand mt-5">
          تصفح القائمة
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold text-muted lg:hidden">
        {formatNumber(count)} أصناف في السلة
      </p>

      {lines.map((line) => {
        const product = productsBySlug[line.slug];
        return (
          <article key={line.key} className="card p-3 sm:p-4">
            <div className="flex gap-3 sm:gap-5">
              <div className="relative h-20 w-20 flex-none overflow-hidden rounded-2xl bg-peach sm:h-28 sm:w-28">
                <Image
                  src={line.image}
                  alt={line.name}
                  fill
                  sizes="112px"
                  className="object-cover object-center"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-extrabold sm:text-base">{line.name}</h3>
                    {product ? (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                        {product.description}
                      </p>
                    ) : null}
                    {line.extras.length > 0 ? (
                      <p className="mt-1 text-[10px] font-semibold text-brand">
                        + {line.extras.join(" · ")}
                      </p>
                    ) : null}
                    {line.notes ? (
                      <p className="mt-1 text-[10px] text-muted">ملاحظات: {line.notes}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="inline-flex flex-none items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-brand-soft hover:text-brand"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    حذف
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <Price value={line.unitPrice} size="md" />
                  <QtyStepper
                    value={line.qty}
                    onChange={(qty) => setQty(line.key, qty)}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {showNotes ? (
        <div className="card mt-4 p-4 sm:p-6">
          <label htmlFor="cart-notes" className="flex items-center gap-2 text-sm font-bold">
            <Pencil className="h-4 w-4 text-brand" aria-hidden />
            ملاحظات على الطلب
            <span className="text-[11px] font-medium text-muted">(اختياري)</span>
          </label>
          <textarea
            id="cart-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value.slice(0, 200))}
            rows={3}
            placeholder="عندك أي طلب خاص؟ اكتبه هنا..."
            className="field mt-3 resize-none"
          />
        </div>
      ) : null}
    </div>
  );
}

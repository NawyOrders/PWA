"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronLeft, MapPin } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { BranchCard } from "@/components/cart/branch-card";
import { CartToolbar } from "@/components/cart/cart-toolbar";
import { CheckoutHeader } from "@/components/cart/checkout-header";
import { FulfillmentToggle } from "@/components/cart/fulfillment-toggle";
import { SummaryCard } from "@/components/cart/summary-card";
import { branches } from "@/lib/data";
import { cn } from "@/lib/format";
import { useStore } from "@/lib/store";

export function BranchExperience() {
  const router = useRouter();
  const { fulfillment, branchId, setBranchId } = useStore();
  const pickup = fulfillment === "pickup";
  const [selected, setSelected] = useState(branchId);
  const selectedBranch = branches.find((branch) => branch.id === selected) ?? branches[0];

  const confirm = () => {
    setBranchId(selected);
    router.push(pickup ? "/cart/payment" : "/cart");
  };

  return (
    <>
      <MobilePageHeader title="اختيار الفرع" backHref="/cart" />

      <div className="container-page pb-16 pt-3 lg:pb-24 lg:pt-6">
        <CartToolbar crumbs={[{ label: "اختيار الفرع" }]} />

        <CheckoutHeader
          title={pickup ? "استلم اوردرك من الفرع مباشر" : "اختار الفرع الأقرب ليك"}
          subtitle={
            pickup
              ? "اختار الفرع الأقرب ليك للاستلام المباشر"
              : "الفرع ده هو اللي هيحضر ويوصل طلبك"
          }
          step="review"
        />

        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <section className="card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">اختار الفرع</h2>
                <p className="mt-1 text-xs text-muted">اختار الأقرب ليك</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </span>
            </div>

            <div className="mt-4 space-y-3" role="radiogroup" aria-label="فروع ناوي أوردر">
              {branches.map((branch) => {
                const active = branch.id === selected;
                return (
                  <label
                    key={branch.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition",
                      active
                        ? "border-brand bg-white shadow-soft"
                        : "border-line bg-white hover:border-brand-mist",
                    )}
                  >
                    <div className="min-w-0 flex-1 text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold sm:text-base">{branch.name}</span>
                        {branch.open ? (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                            مفتوح الان
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-muted">{branch.address}</p>
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft">
                        <MapPin className="h-3 w-3 text-brand" aria-hidden />
                        {branch.distance}
                      </p>
                    </div>
                    <input
                      type="radio"
                      name="branch"
                      value={branch.id}
                      checked={active}
                      onChange={() => setSelected(branch.id)}
                      className="h-5 w-5 flex-none accent-brand"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3 text-sm">
              <span className="text-muted">الفرع المختار</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-brand">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {selectedBranch.name}
              </span>
            </div>

            <button type="button" onClick={confirm} className="btn-brand mt-4 h-12 w-full text-sm">
              تأكيد الفرع
            </button>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <SummaryCard
              ctaHref={pickup ? "/cart/payment" : "/cart/delivery"}
              ctaLabel={pickup ? "المتابعة للدفع" : "المتابعة لإتمام الطلب"}
              caption={
                pickup
                  ? "هتأكد طريقة الدفع في الخطوة الجاية"
                  : "هناك عنوان وتختار طريقة الدفع في الخطوة الجاية"
              }
              authGated
            />
            <div className="flex justify-center">
              <FulfillmentToggle />
            </div>
            <BranchCard />
          </aside>
        </div>
      </div>
    </>
  );
}

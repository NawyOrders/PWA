"use client";

import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { BranchCard } from "@/components/cart/branch-card";
import { CartItems } from "@/components/cart/cart-items";
import { CartToolbar } from "@/components/cart/cart-toolbar";
import { CheckoutHeader } from "@/components/cart/checkout-header";
import { FulfillmentToggle } from "@/components/cart/fulfillment-toggle";
import { SummaryCard } from "@/components/cart/summary-card";
import { formatNumber } from "@/lib/format";
import { useStore } from "@/lib/store";

export function CartExperience() {
  const { count, fulfillment } = useStore();
  const pickup = fulfillment === "pickup";

  return (
    <>
      <MobilePageHeader title="السلة" backHref="/" />

      <div className="container-page pb-16 pt-3 lg:pb-24 lg:pt-6">
        <CartToolbar crumbs={[]} />

        <CheckoutHeader
          title="سلتك فيها كل اللي بتحبه"
          subtitle="راجع طلبك، وعدّل الكمية قبل ما تكمل"
          step="review"
        />

        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <section>
            <div className="hidden items-center justify-between lg:flex">
              <h2 className="text-lg font-extrabold">الأصناف في السلة</h2>
              <span className="text-xs font-semibold text-muted">
                {formatNumber(count)} أصناف
              </span>
            </div>
            <CartItems />
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <SummaryCard
              ctaHref={pickup ? "/cart/branch" : "/cart/delivery"}
              ctaLabel={pickup ? "اختيار الفرع" : "المتابعة لإتمام الطلب"}
              caption={
                pickup
                  ? "اختار الفرع الأقرب ليك، وهنجهز طلبك للاستلام"
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

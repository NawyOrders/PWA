"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, MapPin, Phone, Pencil } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { CartToolbar } from "@/components/cart/cart-toolbar";
import { CheckoutHeader } from "@/components/cart/checkout-header";
import { SummaryCard } from "@/components/cart/summary-card";
import { useStore } from "@/lib/store";

export function DeliveryExperience() {
  const { deliveryFee } = useStore();
  const [building, setBuilding] = useState("12");
  const [floor, setFloor] = useState("الثاني");
  const [apartment, setApartment] = useState("8");
  const [receiver, setReceiver] = useState("أحمد محمد");
  const [phone, setPhone] = useState("010 1234 5678");
  const [instructions, setInstructions] = useState("");

  return (
    <>
      <MobilePageHeader title="بيانات التوصيل" backHref="/cart" />

      <div className="container-page pb-16 pt-3 lg:pb-24 lg:pt-6">
        <CartToolbar crumbs={[{ label: "بيانات التوصيل" }]} />

        <CheckoutHeader
          title="نوصل طلبك لحد عندك"
          subtitle="أكد عنوانك وبيانات التواصل قبل ما تكمل للدفع"
          step="delivery"
        />

        <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
          <section className="space-y-4">
            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  عنوان التوصيل
                </h2>
                <Link
                  href="/addresses/new"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand transition hover:text-brand-strong"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  تغيير العنوان
                </Link>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-peach-light/70 p-4">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">المنزل</span>
                    <span className="text-[10px] font-medium text-muted">العنوان المحدد</span>
                  </span>
                  <span className="mt-1.5 block text-sm font-bold text-ink">
                    زهراء المعادي، المعراج العلوي
                  </span>
                  <span className="mt-1 block text-[11px] leading-5 text-muted">
                    شارع النصر، عمارة 12، بجوار صيدلية العزيزي
                  </span>
                </span>
                <input
                  type="radio"
                  name="address"
                  checked
                  readOnly
                  className="mt-1 h-5 w-5 flex-none accent-brand"
                />
              </label>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <label htmlFor="building" className="mb-1.5 block text-[11px] font-semibold text-muted">
                    رقم العمارة
                  </label>
                  <input
                    id="building"
                    value={building}
                    onChange={(event) => setBuilding(event.target.value)}
                    className="field text-center"
                  />
                </div>
                <div>
                  <label htmlFor="floor" className="mb-1.5 block text-[11px] font-semibold text-muted">
                    الدور
                  </label>
                  <input
                    id="floor"
                    value={floor}
                    onChange={(event) => setFloor(event.target.value)}
                    className="field text-center"
                  />
                </div>
                <div>
                  <label htmlFor="apartment" className="mb-1.5 block text-[11px] font-semibold text-muted">
                    رقم الشقة
                  </label>
                  <input
                    id="apartment"
                    value={apartment}
                    onChange={(event) => setApartment(event.target.value)}
                    className="field text-center"
                  />
                </div>
              </div>
            </div>

            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
                    <Phone className="h-4 w-4" aria-hidden />
                  </span>
                  بيانات التواصل
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand">
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  تعديل
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="receiver" className="mb-1.5 block text-[11px] font-semibold text-muted">
                    اسم المستلم
                  </label>
                  <input
                    id="receiver"
                    value={receiver}
                    onChange={(event) => setReceiver(event.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="mb-1.5 block text-[11px] font-semibold text-muted">
                    رقم الموبايل
                  </label>
                  <input
                    id="contact-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    inputMode="tel"
                    dir="ltr"
                    className="field text-end"
                  />
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted">
                مندوب التوصيل هيتواصل معاك على الرقم ده عند الوصول
              </p>
            </div>

            <div className="card p-4 sm:p-6">
              <label htmlFor="delivery-instructions" className="flex items-center gap-2 text-sm font-bold">
                <Pencil className="h-4 w-4 text-brand" aria-hidden />
                تعليمات التوصيل
                <span className="text-[11px] font-medium text-muted">(اختياري)</span>
              </label>
              <textarea
                id="delivery-instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value.slice(0, 200))}
                rows={3}
                placeholder="من فضلك اتصل بي قبل الوصول، الجرس مش شغال."
                className="field mt-3 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-peach-light px-4 py-3 text-xs font-bold text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand" aria-hidden />
                وقت التوصيل المتوقع: 30 - 45 دقيقة
              </span>
              <span>
                رسوم التوصيل: <span className="text-brand">{deliveryFee === 0 ? "مجانًا" : `${deliveryFee} جنيه`}</span>
              </span>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <SummaryCard
              showItems
              topAction={
                <Link
                  href="/cart"
                  className="text-[11px] font-bold text-brand transition hover:text-brand-strong"
                >
                  تعديل السلة
                </Link>
              }
              ctaHref="/cart/payment"
              ctaLabel="المتابعة للدفع"
              caption="هتختار طريقة الدفع في الخطوة الجاية"
              authGated
            />
          </aside>
        </div>
      </div>
    </>
  );
}

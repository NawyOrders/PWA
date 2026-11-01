"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bike, Clock3, MapPin, NotebookPen, Pencil, Phone, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/providers";
import { user } from "@/lib/data";
import { CartSummary } from "@/components/cart-summary";
import { CheckoutShell } from "@/components/ui";

export function DeliveryView() {
  const { count, t, addresses, selectedAddressId, setFulfilment } = useApp();
  const selected = addresses.find((address) => address.id === selectedAddressId) ?? null;
  const [building, setBuilding] = useState("12");
  const [floor, setFloor] = useState("الثاني");
  const [apartment, setApartment] = useState("8");
  const [name, setName] = useState("أحمد محمد");
  const [phone, setPhone] = useState("010 1234 5678");
  const [instructions, setInstructions] = useState("من فضلك اتصل بي قبل الوصول، الجرس مش شغال.");

  useEffect(() => {
    setFulfilment("delivery");
  }, [setFulfilment]);

  return (
    <CheckoutShell
      activeStep={1}
      title="نوصل طلبك لحد عندك"
      subtitle="أكد عنوانك وبيانات التواصل قبل ما تكمل للدفع."
      backHref="/cart"
      backLabel="الرجوع للسلة"
      breadcrumb={[
        { label: "الرئيسية", href: "/" },
        { label: "السلة", href: "/cart" },
        { label: "بيانات التوصيل" },
      ]}
      mobileTitle="بيانات التوصيل"
      main={
        <>
          <div className="card p-4 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-extrabold lg:text-lg">
                <MapPin className="size-5 text-brand" />
                {t("عنوان التوصيل")}
              </h2>
              <div className="flex items-center gap-3">
                <Link
                  href="/addresses"
                  className="text-[11px] font-bold text-ink/70 underline-offset-4 transition hover:text-brand hover:underline"
                >
                  {t("العناوين المحفوظة")}
                </Link>
                <Link
                  href="/addresses/new"
                  className="flex items-center gap-1 text-[11px] font-bold text-brand transition hover:text-brand-dark"
                >
                  <Pencil className="size-3.5" />
                  {t("تغيير العنوان")}
                </Link>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand-soft/35 p-4">
              <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full border-2 border-brand">
                <span className="size-2 rounded-full bg-brand" />
              </span>
              <div className="flex-1 text-start">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-bold text-ink">
                    {selected ? t(selected.title) : t("المنزل")}
                  </span>
                  <span className="text-[10px] text-muted">{t("العنوان المحدد")}</span>
                </p>
                <p className="mt-2 text-sm font-extrabold lg:text-base">
                  {selected ? t(selected.area) : t(user.address)}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  {selected ? t(selected.detail) : t(user.fullAddress)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 lg:gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted">{t("رقم العمارة")}</span>
                <input
                  value={building}
                  onChange={(event) => setBuilding(event.target.value)}
                  className="field h-11 px-3 py-0 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted">{t("الدور")}</span>
                <input
                  value={floor === "الثاني" ? t("الثاني") : floor}
                  onChange={(event) => setFloor(event.target.value)}
                  className="field h-11 px-3 py-0 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted">{t("رقم الشقة")}</span>
                <input
                  value={apartment}
                  onChange={(event) => setApartment(event.target.value)}
                  className="field h-11 px-3 py-0 text-sm font-bold"
                />
              </label>
            </div>
          </div>

          <div className="card p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-extrabold lg:text-lg">
                <Phone className="size-5 text-brand" />
                {t("بيانات التواصل")}
              </h2>
              <button type="button" className="flex items-center gap-1 text-[11px] font-bold text-brand">
                <Pencil className="size-3.5" />
                {t("تعديل")}
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted">{t("اسم المستلم")}</span>
                <input
                  value={name === "أحمد محمد" ? t("أحمد محمد") : name}
                  onChange={(event) => setName(event.target.value)}
                  className="field h-11 px-3 py-0 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold text-muted">{t("رقم الموبايل")}</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  dir="ltr"
                  className="field h-11 px-3 py-0 text-start text-sm font-bold"
                />
              </label>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted">
              <ShieldCheck className="size-3.5 text-success" />
              {t("مندوب التوصيل هيتواصل معاك على الرقم ده عند وصول الطلب.")}
            </p>
          </div>

          <div className="card p-4 lg:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-base font-extrabold lg:text-lg">
                <NotebookPen className="size-5 text-brand" />
                {t("تعليمات التوصيل")}
                <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[9px] font-semibold text-muted">{t("اختياري")}</span>
              </h2>
              <Link
                href="/checkout/pickup"
                className="flex items-center gap-1 text-[11px] font-bold text-brand transition hover:text-brand-dark"
              >
                <Bike className="size-3.5" />
                {t("تغيير طريقة الاستلام")}
              </Link>
            </div>
            <textarea
              value={
                instructions === "من فضلك اتصل بي قبل الوصول، الجرس مش شغال."
                  ? t("من فضلك اتصل بي قبل الوصول، الجرس مش شغال.")
                  : instructions
              }
              onChange={(event) => setInstructions(event.target.value.slice(0, 200))}
              rows={3}
              className="mt-3 w-full resize-none rounded-xl border border-line bg-cream-50 px-4 py-3 text-xs leading-6 outline-none transition focus:border-brand/40"
            />
          </div>

          <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-[11px] font-semibold lg:px-5">
            <span className="flex items-center gap-2 text-muted">
              <Clock3 className="size-4 text-brand" />
              {t("وقت التوصيل المتوقع: 30 - 45 دقيقة")}
            </span>
            <span className="flex items-center gap-2 text-muted">
              <Bike className="size-4 text-brand" />
              {t("رسوم التوصيل")}: 30 {t("جنيه")} — {count} {t("أصناف")}
            </span>
          </div>
        </>
      }
      aside={
        <CartSummary
          showItems
          ctaLabel="المتابعة للدفع"
          ctaHref="/checkout/payment"
          note="هتختار طريقة الدفع في الخطوة الجاية."
        />
      }
    />
  );
}

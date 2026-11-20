"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  Plus,
  Trash2,
} from "lucide-react";
import { AccountSidebar } from "@/components/account-sidebar";
import { AddressKindIcon } from "@/components/address-icon";
import { LocationPicker } from "@/components/location-picker";
import { useApp } from "@/components/providers";
import { Breadcrumbs, DisplayPageHeader } from "@/components/ui";

export function AddressesView() {
  const router = useRouter();
  const { addresses, removeAddress, selectedAddressId, selectAddress, toast, t, lang } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);

  const saveChanges = () => {
    toast(t("تم حفظ التغييرات"), "info");
    router.push("/profile");
  };

  return (
    <div className="pb-10">
      <DisplayPageHeader title="العناوين الخاصة بك" subtitle="ادارة عناوين التواصل الخاصة بك" backHref="/profile" />

      <div className="shell">
        <div className="hidden items-center justify-between lg:flex lg:pt-8">
          <Breadcrumbs
            items={[
              { label: "الرئيسية", href: "/" },
              { label: "حسابي", href: "/profile" },
              { label: "العناوين المحفوظة" },
            ]}
          />
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm font-bold text-brand transition hover:text-brand-dark"
          >
            {t("العودة لحسابي")}
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </Link>
        </div>

        <div className="hidden pt-4 lg:block">
          <h1 className="text-[32px] font-extrabold">{t("حسابي")}</h1>
          <p className="mt-2 text-sm text-muted">{t("كل تفاصيلك في مكان واحد، لطلب أسهل كل مرة.")}</p>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-5 lg:mt-7 lg:flex-row lg:items-start lg:justify-end">
          <AccountSidebar active="/addresses" />

          <div className="motion-stagger min-w-0 flex-1 space-y-4">
            <div className="card hidden p-5 lg:block">
              <h2 className="text-center text-lg font-extrabold">{t("عناوينك المحفوظة")}</h2>
              <div className="motion-stagger mt-5 space-y-3">
                {addresses.map((item) => {
                  const active = item.id === selectedAddressId;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-2xl border-2 bg-white p-4 transition ${
                        active ? "border-brand/60 bg-brand-soft/25" : "border-line hover:border-brand/30"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => removeAddress(item.id)}
                        aria-label={t("حذف {name}", { name: t(item.title) })}
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-brand transition hover:bg-brand-soft"
                      >
                        <Trash2 className="size-[17px]" strokeWidth={1.9} />
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAddress(item.id)}
                        className="min-w-0 flex-1 text-start"
                      >
                        <span className="block text-sm font-extrabold">{t(item.title)}</span>
                        <span className="mt-1 block truncate text-[11px] text-muted">
                          {t(item.area)}
                          {lang === "ar" ? "، " : ", "}
                          {t(item.detail)}
                        </span>
                        {item.lastUsed ? (
                          <span className="mt-1.5 flex items-center gap-1 text-[10px] text-muted">
                            <CalendarDays className="size-3" />
                            {t(item.lastUsed)}
                          </span>
                        ) : null}
                      </button>
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          active ? "bg-brand text-white" : "bg-cream text-ink/70"
                        }`}
                      >
                        <AddressKindIcon kind={item.kind} />
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d9c8b8] text-sm font-extrabold text-ink/80 transition hover:border-brand/60 hover:text-brand"
              >
                <Plus className="size-5" strokeWidth={2.3} />
                {t("اضافة عنوان جديد")}
              </button>
            </div>

            <div className="card overflow-hidden p-3 lg:hidden">
              <div className="motion-stagger space-y-3">
                {addresses.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted">{t("لا يوجد عناوين سابقة")}</p>
                ) : (
                  addresses.map((item) => {
                    const active = item.id === selectedAddressId;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition ${
                          active ? "border-brand/50 bg-brand-soft/25" : "border-line bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => removeAddress(item.id)}
                          aria-label={t("حذف {name}", { name: t(item.title) })}
                          className="grid size-10 shrink-0 place-items-center rounded-xl text-brand transition hover:bg-brand-soft"
                        >
                          <Trash2 className="size-[18px]" strokeWidth={1.9} />
                        </button>
                        <button
                          type="button"
                          onClick={() => selectAddress(item.id)}
                          className="min-w-0 flex-1 text-start"
                        >
                          <span className="block text-sm font-extrabold">{t(item.title)}</span>
                          <span className="mt-1 block truncate text-[11px] text-muted">
                            {t(item.area)}
                            {lang === "ar" ? "، " : ", "}
                            {t(item.detail)}
                          </span>
                        </button>
                        <span
                          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                            active ? "bg-brand text-white" : "bg-brand-soft text-brand"
                          }`}
                        >
                          <AddressKindIcon kind={item.kind} />
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 flex h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand/60 bg-brand-soft/20 text-base font-extrabold text-brand"
              >
                <Plus className="size-5" strokeWidth={2.4} />
                {t("اضف عنوان جديد")}
              </button>

              <button
                type="button"
                onClick={saveChanges}
                className="btn-gradient mt-4 flex h-14 w-full items-center justify-center rounded-2xl text-base font-extrabold text-white shadow-[0_18px_34px_-18px_rgba(232,69,44,0.95)]"
              >
                {t("حفظ التغييرات")}
              </button>
            </div>

          </div>
        </div>

        {addresses.length === 0 ? (
          <p className="mt-6 text-center text-[11px] text-muted">
            {t("مفيش عناوين محفوظة، ")}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="font-bold text-brand transition hover:text-brand-dark"
            >
              {t("اضف عنوان جديد")}
            </button>
          </p>
        ) : null}

        <LocationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      </div>
    </div>
  );
}

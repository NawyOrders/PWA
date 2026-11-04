"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Bell, ChevronDown, MapPin } from "lucide-react";
import { SearchField } from "@/components/search-field";
import { LanguageToggle } from "@/components/language-toggle";
import { LocationPicker } from "@/components/location-picker";
import { useApp } from "@/components/providers";
import { user } from "@/lib/data";
import { loginHref } from "@/lib/routes";

export function StoreHeader({
  className = "",
  showMobileSearch = true,
}: {
  className?: string;
  showMobileSearch?: boolean;
}) {
  const { t, loggedIn, profile, addresses, selectedAddressId } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);
  const firstName = profile.name.trim().split(/\s+/)[0] || user.name;
  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ?? null;
  const location = selectedAddress ? t(selectedAddress.area) : t(user.address);

  const locationControl: ReactNode = (
    <>
      <span className="grid size-11 place-items-center rounded-full bg-[#f6a723] text-white shadow-[0_12px_24px_-14px_rgba(246,167,35,0.9)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 lg:size-[52px]">
        <MapPin className="size-5 fill-white/30 lg:size-6" />
      </span>
      <div className="text-start">
        <p className="text-[11px] text-muted">
          {loggedIn
            ? t("مرحبا {name}", { name: firstName })
            : t("تسجيل الدخول")}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] font-bold text-ink lg:text-sm">
          {loggedIn ? location : t("سجل الدخول الآن")}
          <ChevronDown className="size-3.5 text-muted transition group-hover:text-brand" />
        </p>
      </div>
    </>
  );

  return (
    <div className={`motion-header ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label={t("اختر مكان التوصيل")}
              aria-haspopup="dialog"
              className="group flex items-center gap-2.5"
            >
              {locationControl}
            </button>
          ) : (
            <Link
              href={loginHref("/")}
              className="group flex items-center gap-2.5"
            >
              {locationControl}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle variant="chip" />
          <Link
            href="/notifications"
            aria-label={t("الإشعارات")}
            className="motion-press relative grid size-11 place-items-center rounded-2xl border border-line bg-white text-ink shadow-soft transition hover:-rotate-3 hover:text-brand"
          >
            <Bell className="size-5" />
            <span className="animate-pulse-soft absolute end-2.5 top-2.5 size-1.5 rounded-full bg-brand" />
          </Link>
        </div>

        <div className="hidden w-[46%] max-w-xl lg:block">
          <SearchField />
        </div>
      </div>
      {showMobileSearch ? <SearchField className="mt-4 lg:hidden" /> : null}
      <LocationPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}

"use client";

import Link from "next/link";
import { Bell, ChevronDown, MapPin } from "lucide-react";
import { SearchField } from "@/components/search-field";
import { useApp } from "@/components/providers";
import { loginHref } from "@/lib/routes";

export function StoreHeader({
  className = "",
  showMobileSearch = true,
}: {
  className?: string;
  showMobileSearch?: boolean;
}) {
  const { t, loggedIn } = useApp();
  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={loggedIn ? "/addresses/new" : loginHref("/")} className="group flex items-center gap-2.5">
            <div className="text-start">
              <p className="text-[11px] text-muted">{loggedIn ? t("مرحبا أحمد") : t("تسجيل الدخول")}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[13px] font-bold text-ink lg:text-sm">
                {loggedIn ? t("زهراء المعادي، المعراج العلوي") : t("سجل الدخول الآن")}
                <ChevronDown className="size-3.5 text-muted transition group-hover:text-brand" />
              </p>
            </div>
            <span className="grid size-11 place-items-center rounded-full bg-[#f6a723] text-white shadow-[0_12px_24px_-14px_rgba(246,167,35,0.9)] lg:size-[52px]">
              <MapPin className="size-5 fill-white/30 lg:size-6" />
            </span>
          </Link>
        </div>

        <Link
          href="/notifications"
          aria-label={t("الإشعارات")}
          className="relative grid size-11 place-items-center rounded-2xl border border-line bg-white text-ink shadow-soft lg:hidden"
        >
          <Bell className="size-5" />
          <span className="absolute end-2.5 top-2.5 size-1.5 rounded-full bg-brand" />
        </Link>

        <div className="hidden w-[46%] max-w-xl lg:block">
          <SearchField />
        </div>
      </div>
      {showMobileSearch ? <SearchField className="mt-4 lg:hidden" /> : null}
    </div>
  );
}

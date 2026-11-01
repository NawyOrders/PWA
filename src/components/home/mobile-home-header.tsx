import Link from "next/link";
import { ChevronDown, MapPin } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { SearchField } from "@/components/ui/search-field";

export function MobileHomeHeader() {
  return (
    <div className="lg:hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-sun text-white shadow-float">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div className="text-start">
            <p className="text-xs font-medium text-muted">مرحبا أحمد</p>
            <Link
              href="/settings"
              className="mt-0.5 flex items-center gap-1 text-sm font-bold leading-tight"
            >
              <span className="max-w-[240px] truncate">زهراء المعادي، المعراج العلوي</span>
              <ChevronDown className="h-4 w-4 flex-none text-ink-soft" aria-hidden />
            </Link>
          </div>
        </div>
        <Link
          href="/"
          aria-label="ناوي أوردر — الرئيسية"
          className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-white p-1 shadow-soft"
        >
          <LogoMark className="h-9 w-9" />
        </Link>
      </div>
      <div className="px-4 pt-4">
        <SearchField id="mobile-home-search" />
      </div>
    </div>
  );
}

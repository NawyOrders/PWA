import { ChevronDown, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { SearchField } from "@/components/ui/search-field";
import { site } from "@/lib/data";

export function DesktopTopBar({
  searchId = "desktop-search",
  search,
}: {
  searchId?: string;
  search?: ReactNode;
}) {
  return (
    <div className="hidden items-center justify-between gap-8 lg:flex">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-sun text-white shadow-float">
          <MapPin className="h-5 w-5" aria-hidden />
        </span>
        <div className="text-start">
          <p className="text-xs font-medium text-muted">مرحبا أحمد</p>
          <p className="mt-0.5 flex items-center gap-1 text-sm font-bold leading-tight">
            {site.address}
            <ChevronDown className="h-4 w-4 text-ink-soft" aria-hidden />
          </p>
        </div>
      </div>
      <div className="w-[38%] min-w-[320px] max-w-[460px]">
        {search ?? <SearchField id={searchId} />}
      </div>
    </div>
  );
}

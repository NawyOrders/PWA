"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function MobilePageHeader({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <button
          type="button"
          onClick={() => (backHref ? router.push(backHref) : router.back())}
          aria-label="رجوع"
          className="icon-btn h-11 w-11 flex-none rounded-2xl bg-white shadow-soft"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        <h1 className="flex-1 text-center text-xl font-extrabold">{title}</h1>
        <div className="flex w-11 flex-none justify-end">{action}</div>
      </div>
    </div>
  );
}

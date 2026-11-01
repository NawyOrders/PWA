"use client";

import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button } from "@/components/ui";
import { LogoMark, BrandWordmark } from "@/components/logo";

export function OfflineView() {
  const { t } = useApp();
  return (
    <div className="shell flex min-h-[78vh] items-center justify-center py-10">
      <div className="card w-full max-w-[460px] px-6 py-10 text-center">
        <div className="flex justify-center">
          <LogoMark className="size-16" />
        </div>
        <BrandWordmark className="mt-4" />

        <span className="mx-auto mt-8 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
          <WifiOff className="size-7" strokeWidth={1.8} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">{t("انت غير متصل بالإنترنت")}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-7 text-muted">
          {t("اتأكد من اتصالك بالنت وحاول تاني. السلة والمفضلة محفوظين عندك وهتلاقيهم أول ما ترجع.")}
        </p>

        <Button block className="mt-6" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" />
          {t("حاول تاني")}
        </Button>
        <Link
          href="/"
          className="mt-3 block text-xs font-bold text-muted transition hover:text-brand"
        >
          {t("العودة للرئيسية")}
        </Link>
      </div>
    </div>
  );
}

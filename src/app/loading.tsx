"use client";

import { useApp } from "@/components/providers";
import { LogoMark } from "@/components/logo";

export default function Loading() {
  const { t } = useApp();
  return (
    <div className="shell flex min-h-[72vh] flex-col items-center justify-center gap-5">
      <LogoMark className="size-20 animate-pulse-soft" />
      <div className="text-center">
        <p className="font-display text-xl font-extrabold text-brand">{t("ناوي أوردرز")}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</p>
      </div>
    </div>
  );
}

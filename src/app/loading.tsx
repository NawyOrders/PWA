"use client";

import { LogoMark } from "@/components/logo";

/**
 * Root route fallback. It must stay free of AppProvider context because the
 * global error route renders this segment without the provider tree.
 */
export default function Loading() {
  return (
    <div className="shell flex min-h-[72vh] flex-col items-center justify-center gap-5">
      <LogoMark className="size-20 animate-pulse-soft" />
      <div className="text-center">
        <p className="font-display text-xl font-extrabold text-brand">ناوي أوردرز</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</p>
      </div>
    </div>
  );
}

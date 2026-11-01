"use client";

import { useApp } from "@/components/providers";

type LogoProps = {
  className?: string;
  title?: string;
};

export function LogoMark({ className = "size-14", title }: LogoProps) {
  const { t } = useApp();
  return (
    <span
      className={`relative grid place-items-center overflow-hidden rounded-[30%] text-[#FBF3EA] ${className}`}
      style={{ backgroundColor: "#E8452C" }}
      role="img"
      aria-label={title ?? t("ناوي أوردرز")}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true">
        <path
          d="M15.5 30.5c0 9.6 7.3 16.8 16.5 16.8s16.5-7.2 16.5-16.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="6.2"
          strokeLinecap="round"
        />
        <path
          d="M33.8 28.9c3.3-3.3 4.1-6.9 1.7-10.4 5.4 1 8.7 5.3 8.7 9.8 0 3.9-2.6 6.5-6.2 7.5z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  const { t } = useApp();
  return (
    <span className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-display text-2xl font-extrabold tracking-tight text-brand">{t("ناوي أوردرز")}</span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</span>
    </span>
  );
}

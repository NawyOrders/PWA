"use client";

import { useOptionalApp } from "@/components/providers";
import { brandingLogoUrl, brandingName } from "@/lib/branding";

type LogoProps = {
  className?: string;
  title?: string;
};

export function LogoMark({ className = "size-14", title }: LogoProps) {
  // Optional: the root loading fallback is prerendered inside /_global-error,
  // which renders without AppProvider.
  const app = useOptionalApp();
  const branding = app?.branding ?? null;
  const logo = brandingLogoUrl(branding);
  const label =
    title ?? brandingName(branding, app?.lang ?? "ar") ?? app?.t("ناوي أوردرز") ?? "ناوي أوردرز";
  return (
    <span
      className={`relative grid place-items-center overflow-hidden rounded-[30%] text-[#FBF3EA] ${className}`}
      style={logo ? undefined : { backgroundColor: "#E8452C" }}
      role="img"
      aria-label={label}
    >
      <img src={logo ?? "/icons/logo.svg"} alt="" className="h-full w-full object-contain" aria-hidden="true" />
    </span>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  const app = useOptionalApp();
  const branding = app?.branding ?? null;
  const name = brandingName(branding, app?.lang ?? "ar") ?? app?.t("ناوي أوردرز") ?? "ناوي أوردرز";
  return (
    <span className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-display text-2xl font-extrabold tracking-tight text-brand">{name}</span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</span>
    </span>
  );
}

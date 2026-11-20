"use client";

import { useOptionalApp } from "@/components/providers";
import { brandingLogoUrl, brandingName } from "@/lib/branding";

type LogoProps = {
  className?: string;
  title?: string;
  /** Server-resolved tenant names, for screens that render without the provider. */
  nameAr?: string | null;
  nameEn?: string | null;
};

export function LogoMark({ className = "size-14", title, nameAr, nameEn }: LogoProps) {
  // Optional: the root loading fallback is prerendered inside /_global-error,
  // which renders without AppProvider.
  const app = useOptionalApp();
  const branding = app?.branding ?? null;
  const lang = app?.lang ?? "ar";
  const logo = brandingLogoUrl(branding);
  const serverName = (lang === "en" ? nameEn : nameAr)?.trim();
  const fallback =
    brandingName(branding, lang) ?? app?.tenantSlug ?? app?.t("ناوي أوردرز") ?? "ناوي أوردرز";
  const label = title ?? (serverName || fallback);
  return (
    <span
      className={`relative grid place-items-center overflow-hidden rounded-[30%] text-cream ${logo ? "" : "bg-brand"} ${className}`}
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
  const lang = app?.lang ?? "ar";
  const name =
    brandingName(branding, lang) ?? app?.tenantSlug ?? app?.t("ناوي أوردرز") ?? "ناوي أوردرز";
  // The Nawy tagline describes this app, not the restaurant, so a tenant
  // storefront shows only its own name.
  const isTenant = Boolean(app?.tenantSlug || branding);
  return (
    <span className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-display text-2xl font-extrabold tracking-tight text-brand">{name}</span>
      {isTenant ? null : (
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</span>
      )}
    </span>
  );
}

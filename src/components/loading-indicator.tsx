"use client";

import Image from "next/image";
import { useState } from "react";
import { useOptionalApp } from "@/components/providers";
import { brandingLogoUrl } from "@/lib/branding";

/**
 * Spinner used while a screen warms up.
 *
 * The tenant's logo replaces the shipped loader when branding provides one.
 * The host is not known ahead of time, so the logo is a plain `<img>` rather
 * than `next/image`. `useOptionalApp` is intentional: the root loading route
 * and `/_global-error` render this outside AppProvider, where it must fall
 * back to `/images/loader.svg` instead of throwing.
 */
export function LoadingIndicator({
  className = "size-12",
  label = "جارٍ التحميل",
}: {
  className?: string;
  label?: string;
}) {
  const app = useOptionalApp();
  const logo = brandingLogoUrl(app?.branding ?? null);

  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [lastLogo, setLastLogo] = useState<string | null>(logo);

  if (logo !== lastLogo) {
    setLastLogo(logo);
    setFailedFor(null);
  }

  return (
    <span role="status" aria-label={label} className={`inline-grid shrink-0 place-items-center ${className}`}>
      {logo && failedFor !== logo ? (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          onError={() => setFailedFor(logo)}
          className="size-full animate-pulse-soft object-contain"
        />
      ) : (
        <Image
          src="/images/loader.svg"
          alt=""
          aria-hidden="true"
          width={55}
          height={55}
          unoptimized
          className="size-full"
        />
      )}
    </span>
  );
}

"use client";

import Image from "next/image";
import { useOptionalApp } from "@/components/providers";
import { brandingLogoUrl } from "@/lib/branding";

export function LoadingIndicator({
  className = "size-12",
  label = "جارٍ التحميل",
}: {
  className?: string;
  label?: string;
}) {
  // Optional: the root loading fallback is prerendered inside /_global-error,
  // which renders without AppProvider; there the Nawy Orders mark stands.
  const app = useOptionalApp();
  const logo = brandingLogoUrl(app?.branding ?? null);
  return (
    <span role="status" aria-label={label} className={`inline-grid shrink-0 place-items-center ${className}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" aria-hidden="true" className="size-full rounded-[30%] object-contain" />
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

"use client";

import { useState } from "react";
import { ItemMedia } from "@/components/ui";

/**
 * Menu artwork.
 *
 * The remote hosts in `menu.json` are not known at build time, so this is a
 * plain lazy `<img>` rather than `next/image` (whose loader would need a
 * `remotePatterns` entry per host). A missing URL or a failed request falls
 * back to the neutral name plate, and changing `src` clears the failure so a
 * corrected URL appears without a reload.
 */
export function MenuImage({
  src,
  name,
  className = "",
  textClassName,
}: {
  src?: string | null;
  /** Already localised; used for both `alt` and the placeholder. */
  name: string;
  className?: string;
  textClassName?: string;
}) {
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [lastSrc, setLastSrc] = useState<string | null | undefined>(src);

  if (src !== lastSrc) {
    setLastSrc(src);
    setFailedFor(null);
  }

  if (!src || failedFor === src) {
    return <ItemMedia name={name} className={className} textClassName={textClassName} />;
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailedFor(src)}
      className={`object-cover ${className}`}
    />
  );
}

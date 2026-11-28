import type { Lang } from "@/lib/i18n";

// Swap these paths to change the hero artwork without touching components.
// The RTL banner has the food on the left and clear space on the right.
// In LTR the same image is mirrored so the clear space sits on the left.
// Provide `ltr` with a dedicated LTR artwork to use it instead of mirroring.
export const heroMedia = {
  rtl: "/images/banner.webp",
  ltr: null as string | null,
};

export function heroImage(lang: Lang) {
  return lang === "en" && heroMedia.ltr ? heroMedia.ltr : heroMedia.rtl;
}

export function heroIsMirrored(lang: Lang) {
  return lang === "en" && !heroMedia.ltr;
}

/** Formats accepted for customer uploads (receipts, feedback screenshots). */
export const UPLOAD_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const RECEIPT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic", "image/heif"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImageFileCheck = { ok: true } | { ok: false; reason: "type" | "size" };

/**
 * Validates an untrusted file before creating an object URL. Checking the MIME
 * type and size keeps disguised executables out of the preview and protects
 * mobile users from accidentally uploading huge files.
 */
export function validateImageFile(
  file: Pick<File, "type" | "size">,
  types: readonly string[] = UPLOAD_IMAGE_TYPES,
  maxBytes: number = MAX_UPLOAD_BYTES,
): ImageFileCheck {
  if (!types.includes(file.type)) return { ok: false, reason: "type" };
  if (file.size > maxBytes) return { ok: false, reason: "size" };
  return { ok: true };
}

// Menu images arrive from the API as an object key, not a URL. The key is only
// readable under the tenant's own public storage prefix, which that tenant's
// branding already points at (its logo lives in the same public bucket). Nothing
// about a specific restaurant is hard-coded here.
const PUBLIC_STORAGE_PREFIX = "/storage/v1/object/public/";

let tenantMediaBase: string | null = null;

export function mediaBaseFromUrl(url?: string | null): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const index = parsed.pathname.indexOf(PUBLIC_STORAGE_PREFIX);
  if (index < 0) return null;
  const bucket = parsed.pathname.slice(index + PUBLIC_STORAGE_PREFIX.length).split("/")[0];
  if (!bucket) return null;
  return `${parsed.origin}${PUBLIC_STORAGE_PREFIX}${bucket}`;
}

/** Set once from the tenant's branding; menu reads then resolve keys under it. */
export function setTenantMediaBase(brandingUrl?: string | null): void {
  tenantMediaBase = mediaBaseFromUrl(brandingUrl);
}

export function getTenantMediaBase(): string | null {
  return tenantMediaBase;
}

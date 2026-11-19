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
export const RECEIPT_IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
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

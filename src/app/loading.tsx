import { headers } from "next/headers";
import { connection } from "next/server";
import { LogoMark } from "@/components/logo";
import { resolveLoadingBrand } from "@/lib/loading-brand";

/**
 * Root route fallback. It must stay free of AppProvider context because the
 * global error route renders this segment without the provider tree, so the
 * brand name comes from the request headers instead (see `loading-brand.ts`).
 */
export default async function Loading() {
  // Opt into a per-request render before reading headers, otherwise the build
  // would try to prerender this fallback with no request to resolve.
  await connection();
  const requestHeaders = await headers();
  const brand = await resolveLoadingBrand((name) => requestHeaders.get(name));

  return (
    <div className="shell flex min-h-[72vh] flex-col items-center justify-center gap-5">
      <LogoMark nameAr={brand.nameAr} nameEn={brand.nameEn} className="size-20 animate-pulse-soft" />
      <div className="text-center">
        <p className="font-display text-xl font-extrabold text-brand">{brand.nameAr}</p>
        {brand.isTenant ? null : (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted">Nawy Orders</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { ProductDetail } from "@/components/product-detail";
import { LoadingIndicator } from "@/components/loading-indicator";
import { useApp } from "@/components/providers";
import { apiConfigured } from "@/lib/api";
import { productsById } from "@/lib/data";
import { menuProduct } from "@/lib/tenant-menu";
import { useMenuItem } from "@/hooks/use-tenant-menu";

/** Loads the detail contract (not the list DTO) so availability and detail images
 * are branch-aware. ProductDetail retains the existing presentation. */
export function RemoteProductDetail({ id }: { id: string }) {
  const { lang, selectedBranchId, branding, t } = useApp();
  const branchId = branding?.branches?.some((branch) => branch.branchId === selectedBranchId) ? selectedBranchId : undefined;
  const remote = useMenuItem(id, branchId);
  if (apiConfigured() && remote.loading) return <div className="shell flex min-h-[60vh] items-center justify-center"><LoadingIndicator className="size-16" /></div>;
  const product = apiConfigured() ? (remote.data ? menuProduct(remote.data, lang) : null) : productsById[id] ?? null;
  if (!product) return <div className="shell py-20 text-center text-muted">{t("تعذر العثور على هذا الصنف")}</div>;
  return <ProductDetail product={product} />;
}

import { getTenantMediaBase } from "./media";
import { apiUrl, type ApiResponse } from "@/lib/api";
import { apiBaseUrl } from "@/lib/api";
import type { Product } from "@/lib/data";
import type { AuthFetch } from "@/lib/session";

export type MenuCategory = { id: string; nameAr?: string | null; nameEn?: string | null; imageKey?: string | null; imageUrl?: string | null; itemCount?: number | null; hasSubCategories?: boolean };
export type MenuSize = { id: string; nameAr?: string | null; nameEn?: string | null; price?: number | null; isDefault?: boolean };
export type MenuItemDto = {
  id: string;
  categoryId?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  hasSizes?: boolean;
  hasAddOns?: boolean;
  isAvailable?: boolean;
  sizes?: MenuSize[] | null;
  isBestSeller?: boolean;
};
export type PagedMenuItems = { items: MenuItemDto[]; totalCount: number; page: number; pageSize: number; totalPages: number; hasPreviousPage: boolean; hasNextPage: boolean };
export type MenuItemDetails = MenuItemDto & { addOns?: Array<{ id: string; nameAr?: string | null; nameEn?: string | null; price?: number | null }> | null };

export class TenantApiError extends Error { constructor(public status: number, public errors?: Record<string, string>) { super("tenant-api-error"); } }

async function request<T>(path: string, init?: RequestInit, authFetch?: AuthFetch): Promise<T> {
  const response = authFetch
    ? await authFetch(path, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } })
    : await fetch(apiUrl(path), { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
  let body: unknown = null;
  try { body = await response.json(); } catch { /* non-JSON middleware responses are expected */ }
  const envelope = body as Partial<ApiResponse<T>> | null;
  if (!response.ok || !envelope?.isSuccess) {
    throw new TenantApiError(response.status, envelope?.errors ?? (body as { errors?: Record<string, string> } | null)?.errors ?? undefined);
  }
  return envelope.data as T;
}

/** Shared envelope-unwrapping transport for the storefront's tenant endpoints. */
export const tenantRequest = request;

function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  const result = params.toString();
  return result ? `?${result}` : "";
}

export const menuApi = {
  categories: (authFetch?: AuthFetch) =>
    request<MenuCategory[]>("/api/v1/menu/categories", undefined, authFetch),
  subcategories: (categoryId: string, authFetch?: AuthFetch) =>
    request<MenuCategory[]>(
      `/api/v1/menu/categories/${encodeURIComponent(categoryId)}/subcategories`,
      undefined,
      authFetch,
    ),
  items: (
    filters: {
      categoryId?: string;
      subCategoryId?: string;
      branchId?: string;
      search?: string;
      pageNumber?: number;
      pageSize?: number;
    },
    authFetch?: AuthFetch,
  ) => {
    const categoryId =
      filters.categoryId && !filters.subCategoryId
        ? filters.categoryId
        : undefined;
    const subCategoryId = filters.subCategoryId;
    return request<PagedMenuItems>(
      `/api/v1/menu/items${query({ subCategoryId, categoryId, branchId: filters.branchId, search: filters.search?.trim().slice(0, 100), pageNumber: filters.pageNumber ?? 1, pageSize: Math.min(filters.pageSize ?? 20, 100) })}`,
      undefined,
      authFetch,
    );
  },
  mostSold: (branchId?: string, authFetch?: AuthFetch, limit = 10) =>
    request<MenuItemDto[]>(
      `/api/v1/menu/most-sold${query({ branchId, limit })}`,
      undefined,
      authFetch,
    ),
  item: (
    id: string,
    branchId?: string,
    coords?: { lat: number; lng: number },
    authFetch?: AuthFetch,
  ) =>
    request<MenuItemDetails>(
      `/api/v1/menu/items/${encodeURIComponent(id)}${query({ branchId, lat: coords?.lat, lng: coords?.lng })}`,
      undefined,
      authFetch,
    ),
};

/** Listing keys are not URLs. The tenant's own storage prefix (from its branding) turns a key into a URL; without one, keep the local placeholder. */
export function menuImage(imageKey?: string | null, imageUrl?: string | null): string {
  if (imageUrl) {
    try { return new URL(imageUrl, apiBaseUrl() || window.location.origin).toString(); } catch { return "/images/burger.webp"; }
  }
  if (imageKey && /^https?:\/\//i.test(imageKey)) return imageKey;
  if (imageKey) {
    const mediaBase = (getTenantMediaBase() ?? process.env.NEXT_PUBLIC_TENANT_MEDIA_BASE_URL ?? "").trim().replace(/\/+$/, "");
    if (mediaBase) {
      try { return new URL(imageKey.replace(/^\/+/, ""), `${mediaBase}/`).toString(); } catch { return "/images/burger.webp"; }
    }
  }
  return "/images/burger.webp";
}

export function menuProduct(item: MenuItemDto, lang: "ar" | "en", category = "menu"): Product {
  const name = (lang === "ar" ? item.nameAr : item.nameEn) || item.nameEn || item.nameAr || "";
  const description = (lang === "ar" ? item.descriptionAr : item.descriptionEn) || item.descriptionEn || item.descriptionAr || "";
  const defaultSize = item.sizes?.find((size) => size.isDefault) ?? item.sizes?.[0];
  return { id: item.id, name, description, price: defaultSize?.price ?? item.price ?? 0, image: menuImage(item.imageKey, item.imageUrl), category, tags: [], popular: item.isBestSeller, isAvailable: item.isAvailable !== false,
    sizes: item.sizes?.map((size) => ({ id: size.id, label: (lang === "ar" ? size.nameAr : size.nameEn) || size.nameEn || size.nameAr || "", price: size.price ?? 0, isDefault: size.isDefault })),
    addOns: (item as MenuItemDetails).addOns?.map((addOn) => ({ id: addOn.id, label: (lang === "ar" ? addOn.nameAr : addOn.nameEn) || addOn.nameEn || addOn.nameAr || "", price: addOn.price ?? 0 })),
  };
}

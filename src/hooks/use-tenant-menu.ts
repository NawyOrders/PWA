"use client";

import { useRequest } from "@/hooks/use-request";
import { apiConfigured } from "@/lib/api";
import { menuApi, type MenuCategory, type MenuItemDto, type PagedMenuItems } from "@/lib/tenant-menu";
export function useMenuCategories() { return useRequest<MenuCategory[]>(apiConfigured(), "categories", menuApi.categories, []); }
export function useMenuItems(filters: { categoryId?: string; subCategoryId?: string; branchId?: string; search?: string; pageNumber?: number; pageSize?: number }) {
  const key = JSON.stringify(filters);
  const categoryIdOk = () =>
    !filters.categoryId || /^[0-9a-f-]{36}$/i.test(filters.categoryId);
  const empty: PagedMenuItems = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0, hasPreviousPage: false, hasNextPage: false };
  return useRequest(
    apiConfigured() && categoryIdOk(),
    key,
    () => menuApi.items(filters),
    empty,
  );
}
export function useMostSold(branchId?: string, limit = 10) {
  return useRequest<MenuItemDto[]>(
    apiConfigured(),
    `most-sold:${branchId ?? ""}:${limit}`,
    () => menuApi.mostSold(branchId, undefined, limit),
    [],
  );
}
export function useMenuItem(id: string, branchId?: string, enabled = true) { return useRequest<MenuItemDto | null>(apiConfigured() && enabled && Boolean(id), `item:${id}:${branchId ?? ""}`, () => menuApi.item(id, branchId), null); }

"use client";

import { useEffect, useState } from "react";
import { apiConfigured } from "@/lib/api";
import { menuApi, type MenuCategory, type MenuItemDto, type PagedMenuItems } from "@/lib/tenant-menu";
type State<T> = { data: T; loading: boolean; error: boolean };
function useRequest<T>(enabled: boolean, key: string, load: () => Promise<T>, initial: T): State<T> {
  const [state, setState] = useState<State<T>>({ data: initial, loading: enabled, error: false });
  useEffect(() => {
    if (!enabled) { setState({ data: initial, loading: false, error: false }); return; }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: false }));
    load().then((data) => !cancelled && setState({ data, loading: false, error: false })).catch(() => !cancelled && setState({ data: initial, loading: false, error: true }));
    return () => { cancelled = true; };
  // `key` intentionally represents all request inputs; callers supply stable loaders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);
  return state;
}

export function useMenuCategories() { return useRequest<MenuCategory[]>(apiConfigured(), "categories", menuApi.categories, []); }
export function useMenuItems(filters: { categoryId?: string; subCategoryId?: string; branchId?: string; search?: string; pageNumber?: number; pageSize?: number }) {
  const key = JSON.stringify(filters);
  const empty: PagedMenuItems = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0, hasPreviousPage: false, hasNextPage: false };
  return useRequest(apiConfigured(), key, () => menuApi.items(filters), empty);
}
export function useMostSold(branchId?: string) { return useRequest<MenuItemDto[]>(apiConfigured(), `most-sold:${branchId ?? ""}`, () => menuApi.mostSold(branchId), []); }
export function useMenuItem(id: string, branchId?: string) { return useRequest<MenuItemDto | null>(apiConfigured() && Boolean(id), `item:${id}:${branchId ?? ""}`, () => menuApi.item(id, branchId), null); }

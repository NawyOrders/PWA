import type { AuthFetch } from "@/lib/session";
import type { SavedAddress } from "@/lib/account-data";
import type { ApiResponse } from "@/lib/api";
import { TenantApiError } from "@/lib/tenant-menu";

type AddressDto = { id: string; placeType: "Apartment" | "Villa" | "Office"; label: string; street: string; latitude: number; longitude: number; buildingName?: string | null; floor?: string | null; apartmentNumber?: string | null; landmark?: string | null; isDefault: boolean; branchId?: string | null; branchNameAr?: string | null; branchNameEn?: string | null };
export type AddressInput = Omit<AddressDto, "id" | "branchId" | "branchNameAr" | "branchNameEn">;

async function protectedRequest<T>(authFetch: AuthFetch, path: string, init?: RequestInit): Promise<T> {
  const response = await authFetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  let body: unknown = null;
  try { body = await response.json(); } catch { /* body-less 401 is documented */ }
  const envelope = body as Partial<ApiResponse<T>> | null;
  if (!response.ok || !envelope?.isSuccess) throw new TenantApiError(response.status, envelope?.errors ?? undefined);
  return envelope.data as T;
}

export function savedAddress(dto: AddressDto): SavedAddress {
  const kind = dto.placeType === "Office" ? "work" : dto.label.toLowerCase().includes("family") ? "family" : "home";
  return { id: dto.id, title: dto.label, detail: [dto.street, dto.buildingName, dto.floor, dto.apartmentNumber, dto.landmark].filter(Boolean).join(" - "), area: dto.branchNameAr || dto.branchNameEn || dto.street, kind, lat: dto.latitude, lng: dto.longitude, branchId: dto.branchId ?? null, isDefault: dto.isDefault };
}

export const addressApi = {
  list: async (authFetch: AuthFetch) => (await protectedRequest<AddressDto[]>(authFetch, "/api/v1/account/addresses")).map(savedAddress),
  /** A 404 here is the documented "no default address" state, not a fake address. */
  default: async (authFetch: AuthFetch) => savedAddress(await protectedRequest<AddressDto>(authFetch, "/api/v1/account/addresses/default")),
  create: async (authFetch: AuthFetch, input: AddressInput) => savedAddress(await protectedRequest<AddressDto>(authFetch, "/api/v1/account/addresses", { method: "POST", body: JSON.stringify(input) })),
  update: async (authFetch: AuthFetch, id: string, input: AddressInput) => savedAddress(await protectedRequest<AddressDto>(authFetch, `/api/v1/account/addresses/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) })),
  setDefault: async (authFetch: AuthFetch, id: string) => savedAddress(await protectedRequest<AddressDto>(authFetch, `/api/v1/account/addresses/${encodeURIComponent(id)}/default`, { method: "PATCH" })),
};

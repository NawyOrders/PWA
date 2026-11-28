import { tenantRequest } from "@/lib/tenant-menu";
import type { AuthFetch } from "@/lib/session";

/** One item inside a storefront offer, as the tenant API returns it. */
export type OfferItem = {
  menuItemId: string;
  nameAr?: string | null;
  nameEn?: string | null;
  itemSizeId?: string | null;
  sizeNameAr?: string | null;
  sizeNameEn?: string | null;
  quantity?: number | null;
  originalPrice?: number | null;
  offerPrice?: number | null;
  savedAmount?: number | null;
  discountPercentage?: number | null;
  imageUrl?: string | null;
};

export type PromotionalOffer = {
  id: string;
  kind?: "SingleItem" | "Combo" | null;
  titleAr?: string | null;
  titleEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  originalPrice?: number | null;
  offerPrice?: number | null;
  savedAmount?: number | null;
  discountPercentage?: number | null;
  startsAtUtc?: string | null;
  endsAtUtc?: string | null;
  remainingSeconds?: number | null;
  items?: OfferItem[] | null;
};

export type DailyRecurringOffer = {
  id: string;
  titleAr?: string | null;
  titleEn?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  imageUrl?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  isOvernightWindow?: boolean;
  discountType?: "Percentage" | "FixedOverridePrice" | null;
  discountValue?: number | null;
  windowEndsAtUtc?: string | null;
  campaignEndsAtUtc?: string | null;
  remainingSeconds?: number | null;
  items?: OfferItem[] | null;
};

/** `GET /api/v1/offers` payload: everything the storefront can advertise now. */
export type OffersFeed = {
  resolvedBranchId?: string | null;
  promotionalOffers?: PromotionalOffer[] | null;
  dailyRecurringOffers?: DailyRecurringOffer[] | null;
};

function query(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : "";
}

export const offersApi = {
  feed: (filters: { branchId?: string; lat?: number; lng?: number } = {}, authFetch?: AuthFetch) =>
    tenantRequest<OffersFeed>(
      `/api/v1/offers${query({ branchId: filters.branchId, lat: filters.lat, lng: filters.lng })}`,
      undefined,
      authFetch,
    ),
};

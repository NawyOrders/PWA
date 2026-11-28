"use client";

import { apiConfigured } from "@/lib/api";
import { useRequest } from "@/hooks/use-request";
import { offersApi, type OffersFeed } from "@/lib/tenant-offers";

/** The live offers feed for the selected branch; null until loaded or on error. */
export function useOffers(branchId?: string, enabled = true) {
  return useRequest<OffersFeed | null>(
    apiConfigured() && enabled,
    `offers:${branchId ?? ""}`,
    () => offersApi.feed({ branchId }),
    null,
  );
}

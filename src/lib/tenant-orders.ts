import type { Order, PaymentMethodId } from "@/lib/data";
import type { AuthFetch } from "@/lib/session";
import { TenantApiError, tenantRequest } from "@/lib/tenant-menu";

/* -------------------------------------------------------------------------- */
/* Orders: the tenant owns the order, so the storefront writes it and reads it */
/* back instead of keeping a private list in the browser.                     */
/* -------------------------------------------------------------------------- */

/** One cart line, in the ids the tenant's menu actually uses. */
export type PlaceOrderLine = {
  menuItemId: string;
  itemSizeId: string | null;
  quantity: number;
};

export type PlaceOrderPayload = {
  branchId: string | null;
  /** 0 = delivery, 1 = pickup, matching the admin dashboard's mapping. */
  fulfilmentType: number;
  address: string | null;
  items: PlaceOrderLine[];
  addOnIds: string[];
  customerNotes: string | null;
  paymentMethod: string;
  couponCode: string | null;
};

/** `POST /api/v1/orders` — the tenant's own answer, including its totals. */
export type PlacedOrder = {
  orderNumber?: string | null;
  status?: string | null;
  fulfilmentType?: number | null;
  branchId?: string | null;
  address?: string | null;
  subTotal?: number | null;
  deliveryFee?: number | null;
  discountAmount?: number | null;
  total?: number | null;
};

/** `GET /api/v1/orders/my-orders` item. Line items are not part of the list. */
export type CustomerOrderDto = {
  orderId: string;
  orderNumber?: string | null;
  status: number;
  fulfilmentType: number;
  branchId: string;
  total: number;
  deliveryFee: number;
  paymentMethod?: number | null;
  paymentStatus?: number | null;
  createdAtUtc: string;
};

/** `POST /payment-proof/upload-url` answer: where to PUT the receipt image. */
export type ProofUploadTarget = {
  objectKey?: string | null;
  uploadUrl?: string | null;
  expiresAtUtc?: string | null;
  contentType?: string | null;
  maximumSizeBytes?: number | null;
};

type Paged<T> = {
  items: T[] | null;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/* Order status codes, from the tenant API reference:
   0 New, 1 Accepted, 2 Rejected, 3 Preparing, 4 Ready, 5 OutForDelivery,
   6 Completed, 7 CancelledByRestaurant, 8 Closed. The storefront groups them
   into "still with the restaurant" and "finished". */
const FINISHED_STATUSES = new Set([5, 6, 8]);
const CANCELLED_STATUSES = new Set([2, 7]);

export function isFinishedStatus(code: number): boolean {
  return FINISHED_STATUSES.has(code) || CANCELLED_STATUSES.has(code);
}

function paymentMethodOf(code: number | null | undefined): PaymentMethodId | undefined {
  if (code === 0) return "cash";
  if (code === 1) return "instapay";
  if (code === 2) return "wallet";
  return undefined;
}

function formatOrderDate(createdAtUtc: string, lang: "ar" | "en"): string {
  const created = Date.parse(createdAtUtc);
  if (!Number.isFinite(created)) return "";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(created));
}

/**
 * Maps the customer's server-side history into the rows the orders screen
 * renders. The list endpoint returns no line items, so the row names the
 * fulfilment instead of inventing a dish.
 */
export function customerOrders(items: CustomerOrderDto[], lang: "ar" | "en"): Order[] {
  return items.map((item) => {
    const id = item.orderNumber?.trim() || item.orderId.slice(0, 8);
    const fulfilment = item.fulfilmentType === 1 ? "pickup" : "delivery";
    const created = Date.parse(item.createdAtUtc);
    const cancelled = CANCELLED_STATUSES.has(item.status);
    const label =
      fulfilment === "pickup"
        ? lang === "ar"
          ? "استلام من الفرع"
          : "Branch pickup"
        : lang === "ar"
          ? "توصيل"
          : "Delivery";
    return {
      id,
      status: isFinishedStatus(item.status) ? "delivered" : "preparing",
      title: cancelled ? (lang === "ar" ? `${label} · ملغي` : `${label} · Cancelled`) : label,
      date: formatOrderDate(item.createdAtUtc, lang),
      description: `#${id}`,
      total: item.total,
      image: "/images/burger.webp",
      items: [],
      paymentMethod: paymentMethodOf(item.paymentMethod),
      fulfilment,
      branchId: item.branchId,
      createdAt: Number.isFinite(created) ? created : undefined,
    };
  });
}

/** A v4 uuid for one checkout attempt, with a fallback for older browsers. */
export function idempotencyKey(): string {
  const uuid = globalThis.crypto?.randomUUID;
  if (typeof uuid === "function") return uuid.call(globalThis.crypto);
  return `ab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** `POST /api/v1/coupons/validate` — the server's own discount preview. */
export type CouponQuote = {
  couponId?: string | null;
  code: string;
  totalDiscountAmount: number;
  finalTotalPreview?: number | null;
  endsAtUtc?: string | null;
};

/** Why a coupon was refused, in the customer's words (Arabic source text). */
export function couponErrorMessage(error: unknown): string {
  if (error instanceof TenantApiError) {
    const keys = Object.keys(error.errors ?? {}).join(" ");
    if (keys.includes("NotFound")) return "كود الخصم غير صحيح";
    if (keys.includes("Expired")) return "كود الخصم ده انتهت صلاحيته";
    if (keys.includes("NotStarted")) return "كود الخصم ده لسه ما بدأش";
    if (keys.includes("Inactive") || keys.includes("NotActive")) return "كود الخصم ده مش مفعّل دلوقتي";
    if (keys.includes("Minimum") || keys.includes("MinOrder")) return "الطلب أقل من الحد الأدنى لكود الخصم ده";
    if (keys.includes("Limit") || keys.includes("Usage") || keys.includes("Exhausted")) return "كود الخصم ده وصل للحد الأقصى للاستخدام";
    if (keys.includes("FirstOrder")) return "كود الخصم ده للطلب الأول بس";
    if (error.status === 404) return "كود الخصم غير صحيح";
  }
  return "تعذر التحقق من كود الخصم، جرّب تاني";
}

export const couponApi = {
  validate: (code: string, subTotal: number, deliveryFee: number) =>
    tenantRequest<CouponQuote>("/api/v1/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subTotal, deliveryFee }),
    }),
};

export const orderApi = {
  /**
   * `POST /api/v1/orders` refuses a request without an `Idempotency-Key`
   * header. The key also makes a retried submit land on the same order instead
   * of placing a second one.
   */
  place: (payload: PlaceOrderPayload, authFetch: AuthFetch, key: string) =>
    tenantRequest<PlacedOrder>(
      "/api/v1/orders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify(payload),
      },
      authFetch,
    ),
  myOrders: (authFetch: AuthFetch, pageSize = 50) =>
    tenantRequest<Paged<CustomerOrderDto>>(
      `/api/v1/orders/my-orders?pageNumber=1&pageSize=${Math.min(Math.max(pageSize, 1), 100)}`,
      undefined,
      authFetch,
    ).then((page) => page.items ?? []),
  proofUploadUrl: (
    orderId: string,
    body: { fileName: string; contentType: string; sizeBytes: number },
    authFetch: AuthFetch,
  ) =>
    tenantRequest<ProofUploadTarget>(
      `/api/v1/orders/${encodeURIComponent(orderId)}/payment-proof/upload-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      authFetch,
    ),
  proofComplete: (orderId: string, objectKey: string, authFetch: AuthFetch) =>
    tenantRequest<unknown>(
      `/api/v1/orders/${encodeURIComponent(orderId)}/payment-proof/complete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey }),
      },
      authFetch,
    ),
};

/**
 * Sends the receipt image to the order the customer just placed. The place
 * response only carries the order number, so the uuid comes from my-orders.
 */
export async function uploadPaymentProof(
  authFetch: AuthFetch,
  orderNumber: string,
  file: Blob,
  fileName: string,
  contentType: string,
): Promise<void> {
  const mine = await orderApi.myOrders(authFetch, 10);
  const row = mine.find((order) => order.orderNumber === orderNumber);
  if (!row) throw new Error("proof:order-not-found");
  const target = await orderApi.proofUploadUrl(
    row.orderId,
    { fileName, contentType, sizeBytes: file.size },
    authFetch,
  );
  if (!target.uploadUrl || !target.objectKey) throw new Error("proof:no-upload-url");
  if (target.maximumSizeBytes && file.size > target.maximumSizeBytes) {
    throw new Error("proof:too-large");
  }
  const upload = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": target.contentType ?? contentType },
    body: file,
  });
  if (!upload.ok) throw new Error(`proof:upload-${upload.status}`);
  await orderApi.proofComplete(row.orderId, target.objectKey, authFetch);
};

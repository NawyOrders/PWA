import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadPaymentProof } from "@/lib/tenant-orders";

const MY_ORDERS = {
  items: [
    {
      orderId: "ord-1",
      orderNumber: "1001",
      status: 1,
      fulfilmentType: 1,
      branchId: "b",
      total: 0,
      deliveryFee: 0,
      createdAtUtc: "2026-11-28T00:00:00Z",
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
};

function stubAuthFetch(routes: Record<string, (init?: RequestInit) => unknown>) {
  return vi.fn(async (path: string, init?: RequestInit) => {
    const handler = routes[path];
    if (!handler) return { ok: false, status: 404, json: async () => null };
    return { ok: true, status: 200, json: async () => ({ isSuccess: true, data: handler(init) }) };
  }) as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("uploadPaymentProof", () => {
  it("resolves the order id, uploads the bytes and completes the proof", async () => {
    const putCalls: Array<{ url: string; body: unknown; contentType: string | null }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        putCalls.push({
          url,
          body: init?.body,
          contentType: new Headers(init?.headers).get("Content-Type"),
        });
        return new Response(null, { status: 200 });
      }),
    );
    const completeBodies: string[] = [];
    const authFetch = stubAuthFetch({
      "/api/v1/orders/my-orders?pageNumber=1&pageSize=10": () => MY_ORDERS,
      "/api/v1/orders/ord-1/payment-proof/upload-url": (init) => {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          fileName: "receipt.jpg",
          contentType: "image/jpeg",
          sizeBytes: 5,
        });
        return {
          objectKey: "proofs/ord-1/abc.jpg",
          uploadUrl: "https://uploads.example/abc.jpg?sig=1",
          contentType: "image/jpeg",
          maximumSizeBytes: 5_000_000,
        };
      },
      "/api/v1/orders/ord-1/payment-proof/complete": (init) => {
        completeBodies.push(String(init?.body));
        return {};
      },
    });

    await uploadPaymentProof(authFetch, "1001", new Blob(["BYTES"]), "receipt.jpg", "image/jpeg");

    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].url).toBe("https://uploads.example/abc.jpg?sig=1");
    expect(putCalls[0].contentType).toBe("image/jpeg");
    expect(JSON.parse(completeBodies[0])).toEqual({ objectKey: "proofs/ord-1/abc.jpg" });
  });

  it("rejects files above the server limit before uploading", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const authFetch = stubAuthFetch({
      "/api/v1/orders/my-orders?pageNumber=1&pageSize=10": () => MY_ORDERS,
      "/api/v1/orders/ord-1/payment-proof/upload-url": () => ({
        objectKey: "k",
        uploadUrl: "https://uploads.example/k",
        contentType: "image/jpeg",
        maximumSizeBytes: 4,
      }),
    });

    await expect(
      uploadPaymentProof(authFetch, "1001", new Blob(["01234567890"]), "big.jpg", "image/jpeg"),
    ).rejects.toThrow("proof:too-large");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws when the order number is unknown to the customer", async () => {
    const authFetch = stubAuthFetch({
      "/api/v1/orders/my-orders?pageNumber=1&pageSize=10": () => MY_ORDERS,
    });
    await expect(
      uploadPaymentProof(authFetch, "9999", new Blob(["BYTES"]), "receipt.jpg", "image/jpeg"),
    ).rejects.toThrow("proof:order-not-found");
  });

  it("fails when the upload itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    const authFetch = stubAuthFetch({
      "/api/v1/orders/my-orders?pageNumber=1&pageSize=10": () => MY_ORDERS,
      "/api/v1/orders/ord-1/payment-proof/upload-url": () => ({
        objectKey: "k",
        uploadUrl: "https://uploads.example/k",
        contentType: "image/jpeg",
        maximumSizeBytes: 5_000_000,
      }),
    });
    await expect(
      uploadPaymentProof(authFetch, "1001", new Blob(["BYTES"]), "receipt.jpg", "image/jpeg"),
    ).rejects.toThrow("proof:upload-403");
  });
});

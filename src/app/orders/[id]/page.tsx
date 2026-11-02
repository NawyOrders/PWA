import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderDetailView } from "@/components/order-detail-view";

export const metadata: Metadata = {
  title: "تتبع الطلب",
};

// Order ids are created on the client (localStorage), so the set of valid
// params is unknown at build time. Mark the route as blocking so the dynamic
// segment can render at request time instead of failing prerender.
export const instant = false;

function TrackingFallback() {
  return (
    <div className="shell min-h-[60vh] py-8" aria-hidden="true">
      <div className="mx-auto max-w-5xl animate-pulse space-y-5">
        <div className="h-8 w-48 rounded-lg bg-cream" />
        <div className="h-64 rounded-3xl bg-cream" />
        <div className="h-28 rounded-3xl bg-cream" />
      </div>
    </div>
  );
}

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<TrackingFallback />}>
      <OrderDetailView orderId={id} />
    </Suspense>
  );
}

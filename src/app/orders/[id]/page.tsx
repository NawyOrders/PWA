import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderDetailView } from "@/components/order-detail-view";
import { LoadingIndicator } from "@/components/loading-indicator";

export const metadata: Metadata = {
  title: "تتبع الطلب",
};

// Order ids are created on the client (localStorage), so the set of valid
// params is unknown at build time. Mark the route as blocking so the dynamic
// segment can render at request time instead of failing prerender.
export const instant = false;

function TrackingFallback() {
  return (
    <div className="shell flex min-h-[60vh] items-center justify-center py-8">
      <LoadingIndicator className="size-16" />
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

import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderTrackingView } from "@/components/order-tracking-view";
import { orders } from "@/lib/data";

export const metadata: Metadata = {
  title: "تتبع الطلب",
};

export function generateStaticParams() {
  return [...new Set(orders.map((order) => order.id))].map((id) => ({ id }));
}

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

async function OrderTrackingContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = orders.find((item) => item.id === id);
  if (!order) notFound();
  return <OrderTrackingView order={order} />;
}

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<TrackingFallback />}>
      <OrderTrackingContent params={params} />
    </Suspense>
  );
}

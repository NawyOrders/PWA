import { Suspense } from "react";
import { RemoteProductDetail } from "@/components/remote-product-detail";
import { LoadingIndicator } from "@/components/loading-indicator";

async function ProductContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RemoteProductDetail id={id} />;
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="shell flex min-h-[60vh] items-center justify-center py-8">
          <LoadingIndicator className="size-16" />
        </div>
      }
    >
      <ProductContent params={params} />
    </Suspense>
  );
}

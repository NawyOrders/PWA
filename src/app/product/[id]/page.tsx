import { Suspense } from "react";
import { ProductDetail } from "@/components/product-detail";
import { LoadingIndicator } from "@/components/loading-indicator";

/**
 * The menu lives per tenant and is already loaded by the provider, so this page
 * cannot enumerate static ids or resolve names on the server. It passes the id
 * down and the client resolves it against the tenant menu, showing a friendly
 * empty state for an id the tenant no longer sells.
 */
async function ProductContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductDetail productId={id} />;
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

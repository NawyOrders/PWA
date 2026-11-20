import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { LoadingIndicator } from "@/components/loading-indicator";
import { products, productsById } from "@/lib/data";

export async function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = productsById[id];
  return { title: product ? product.name : "الطبق غير موجود" };
}

async function ProductContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = productsById[id];
  if (!product) notFound();
  return <ProductDetail product={product} />;
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

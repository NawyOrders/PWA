import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/product-detail";
import {
  categoriesBySlug,
  products,
  productsBySlug,
} from "@/lib/data";
import { breadcrumbSchema, pageMetadata, productSchema } from "@/lib/seo";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = productsBySlug[slug];
  if (!product) return {};

  return pageMetadata({
    title: `${product.name} — ${product.price} جنيه`,
    description: `${product.description}. اطلب ${product.name} من ناوي أوردر مع توصيل سريع وأسعار مناسبة.`,
    path: `/product/${product.slug}`,
    image: {
      url: product.image,
      width: 832,
      height: 652,
      alt: product.name,
    },
  });
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = productsBySlug[slug];
  if (!product) notFound();

  const category = categoriesBySlug[product.category];
  const schema = productSchema(product.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            schema,
            breadcrumbSchema([
              { name: "الأقسام", path: "/categories" },
              { name: category.name, path: `/categories/${category.slug}` },
              { name: product.name, path: `/product/${product.slug}` },
            ]),
          ]),
        }}
      />

      <ProductDetail product={product} categoryName={category.name} />
    </>
  );
}

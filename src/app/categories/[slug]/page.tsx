import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { DesktopTopBar } from "@/components/home/desktop-top-bar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CategoryGrid, CategoryStrip } from "@/components/menu/category-views";
import { CategoryProductList } from "@/components/menu/category-product-list";
import {
  categories,
  categoriesBySlug,
  getProductsByCategory,
  type CategorySlug,
} from "@/lib/data";
import {
  breadcrumbSchema,
  itemListSchema,
  pageMetadata,
} from "@/lib/seo";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = categoriesBySlug[slug as CategorySlug];
  if (!category) return {};

  return pageMetadata({
    title: `${category.name} — أطلب أونلاين`,
    description: `${category.blurb}. اطلب ${category.name} من ناوي أوردر مع توصيل سريع، دفع عند الاستلام، وأسعار مناسبة.`,
    path: `/categories/${category.slug}`,
  });
}

export default async function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = categoriesBySlug[slug as CategorySlug];
  if (!category) notFound();

  const items = getProductsByCategory(category.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([
              { name: "الأقسام", path: "/categories" },
              { name: category.name, path: `/categories/${category.slug}` },
            ]),
            itemListSchema(
              items.map((product) => ({
                name: product.name,
                path: `/product/${product.slug}`,
              })),
              `أطباق ${category.name}`,
            ),
          ]),
        }}
      />

      <MobilePageHeader title={category.name} backHref="/categories" />

      <div className="container-page pt-4 lg:pt-6">
        <DesktopTopBar searchId="category-search" />

        <Breadcrumbs
          items={[
            { label: "الأقسام", href: "/categories" },
            { label: category.name },
          ]}
          className="mt-4 hidden lg:flex"
        />

        <h1 className="mt-5 hidden items-center gap-2.5 text-3xl font-extrabold lg:flex">
          {category.name}
          <span className="text-sm font-bold text-muted">
            {items.length} أطباق
          </span>
        </h1>

        <div className="mt-4 lg:hidden">
          <CategoryStrip active={category.slug} slugs={categories.map((item) => item.slug)} />
        </div>
        <div className="mt-6 hidden lg:block">
          <CategoryGrid active={category.slug} />
        </div>

        <CategoryProductList products={items} categoryName={category.name} />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/mobile-page-header";
import { DesktopTopBar } from "@/components/home/desktop-top-bar";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CategoryGrid, CategoryStrip } from "@/components/menu/category-views";
import { FoodCard } from "@/components/menu/food-card";
import { categories, getPopularProducts } from "@/lib/data";
import {
  breadcrumbSchema,
  itemListSchema,
  pageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "الأقسام — برجر وبيتزا وفرايد تشيكن",
  description:
    "اتصفح كل أقسام ناوي أوردر: برجر، بيتزا، توست، فرايد تشيكن، مشروبات، حلويات ومقبلات. اطلب أطباقك المفضلة أونلاين مع توصيل سريع.",
  path: "/categories",
});

export default function CategoriesPage() {
  const popular = getPopularProducts(4);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbSchema([{ name: "الأقسام", path: "/categories" }]),
            itemListSchema(
              categories.map((category) => ({
                name: category.name,
                path: `/categories/${category.slug}`,
              })),
              "أقسام قائمة ناوي أوردر",
            ),
          ]),
        }}
      />

      <MobilePageHeader title="الأقسام" backHref="/" />

      <div className="container-page pt-4 lg:pt-6">
        <DesktopTopBar searchId="categories-search" />

        <Breadcrumbs items={[{ label: "الأقسام" }]} className="mt-4 hidden lg:flex" />

        <div className="mt-3 flex items-end justify-between gap-4 lg:mt-6">
          <h1 className="hidden items-center gap-2.5 text-3xl font-extrabold lg:flex">
            الأقسام
            <LayoutGrid className="h-6 w-6 text-brand" aria-hidden />
          </h1>
          <Link
            href="/categories/burger"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand transition hover:text-brand-strong"
          >
            عرض كل الأصناف (12)
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="mt-4 lg:hidden">
          <CategoryStrip />
        </div>
        <div className="mt-6 hidden lg:block">
          <CategoryGrid />
        </div>

        <section aria-labelledby="categories-popular" className="mt-9 lg:mt-12">
          <h2 id="categories-popular" className="text-xl font-extrabold sm:text-2xl">
            الأكثر طلبًا في كل الأقسام
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {popular.map((product) => (
              <FoodCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

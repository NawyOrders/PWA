import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryDetailView } from "@/components/category-detail-view";
import { categories, categoriesById, type CategoryId } from "@/lib/data";

export function generateStaticParams() {
  return categories.map((category) => ({ category: category.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const item = categoriesById[category as CategoryId];
  return { title: item ? item.name : "قسم غير موجود" };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const item = categoriesById[category as CategoryId];
  if (!item) notFound();
  return <CategoryDetailView categoryId={item.id} />;
}

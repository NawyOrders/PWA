import { CategoryDetailView } from "@/components/category-detail-view";

/**
 * Categories are per-tenant menu data, so the id is resolved in the client
 * against the menu the provider loaded rather than against built-in fixtures.
 */
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <CategoryDetailView categoryId={category} />;
}

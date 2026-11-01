import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = {
  title: "نتائج البحث",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return <SearchView query={params.q?.trim() || "برجر"} />;
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";
import { LoadingIndicator } from "@/components/loading-indicator";

export const metadata: Metadata = {
  title: "نتائج البحث",
};

async function SearchContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  return <SearchView query={params.q?.trim() || "برجر"} />;
}

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="shell flex min-h-[60vh] items-center justify-center py-8">
          <LoadingIndicator className="size-16" />
        </div>
      }
    >
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

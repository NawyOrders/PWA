import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/search-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "ابحث في قائمة الطعام",
  description:
    "ابحث عن أي طبق في قائمة ناوي أوردر — برجر، بيتزا، فرايد تشيكن، توست، مشروبات وحلويات — واطلبه أونلاين.",
  path: "/search",
  noIndex: true,
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function SearchContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const raw = params.q;
  const initialQuery = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");

  return <SearchExperience initialQuery={initialQuery} />;
}

function SearchFallback() {
  return (
    <div className="container-page pt-6">
      <div className="h-12 w-full animate-pulse rounded-2xl bg-white/80" />
      <div className="mt-6 h-8 w-64 animate-pulse rounded-full bg-white/80" />
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card h-56 animate-pulse bg-white/70" />
        ))}
      </div>
    </div>
  );
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

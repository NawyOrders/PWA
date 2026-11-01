import type { Metadata } from "next";
import { BranchExperience } from "@/components/cart/branch-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "اختيار الفرع",
  description: "اختار فرع ناوي أوردر الأقرب ليك للاستلام أو التوصيل.",
  path: "/cart/branch",
  noIndex: true,
});

export default function BranchPage() {
  return <BranchExperience />;
}

import type { Metadata } from "next";
import { BranchView } from "@/components/branch-view";

export const metadata: Metadata = {
  title: "اختيار الفرع",
};

export default function BranchPage() {
  return <BranchView />;
}

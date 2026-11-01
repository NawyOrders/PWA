import type { Metadata } from "next";
import { PoliciesView } from "@/components/policies-view";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
};

export default function PoliciesPage() {
  return <PoliciesView />;
}

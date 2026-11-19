import type { Metadata } from "next";
import { CategoriesView } from "@/components/categories-view";

export const metadata: Metadata = {
  title: "الأقسام",
};

export default function CategoriesPage() {
  return <CategoriesView />;
}

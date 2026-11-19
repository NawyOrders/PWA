import type { Metadata } from "next";
import { FavoritesView } from "@/components/favorites-view";

export const metadata: Metadata = {
  title: "المفضلة",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}

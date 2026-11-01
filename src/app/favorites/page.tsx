import type { Metadata } from "next";
import { FavoritesExperience } from "@/components/profile/favorites-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "المفضلة",
  description: "أطباقك المفضلة من ناوي أوردر جاهزة لطلبك القادم.",
  path: "/favorites",
  noIndex: true,
});

export default function FavoritesPage() {
  return <FavoritesExperience />;
}

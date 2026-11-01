import type { Metadata } from "next";
import { ProfileExperience } from "@/components/profile/profile-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "حسابي",
  description: "بياناتك وطلباتك ومفضلتك ونقاطك في حسابك على ناوي أوردر.",
  path: "/profile",
  noIndex: true,
});

export default function ProfilePage() {
  return <ProfileExperience />;
}

import type { Metadata } from "next";
import { NotificationsExperience } from "@/components/profile/notifications-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "الإشعارات",
  description: "تابع طلباتك وعروض ناوي أوردر في مكان واحد.",
  path: "/notifications",
  noIndex: true,
});

export default function NotificationsPage() {
  return <NotificationsExperience />;
}

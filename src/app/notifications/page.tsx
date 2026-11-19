import type { Metadata } from "next";
import { NotificationsView } from "@/components/notifications-view";

export const metadata: Metadata = {
  title: "الإشعارات",
};

export default function NotificationsPage() {
  return <NotificationsView />;
}

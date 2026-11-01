import type { Metadata } from "next";
import { SettingsExperience } from "@/components/profile/settings-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "الاعدادات",
  description: "تحكم في تفضيلات حسابك والإشعارات واللغة في ناوي أوردر.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsPage() {
  return <SettingsExperience />;
}

import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = {
  title: "الاعدادات",
};

export default function SettingsPage() {
  return <SettingsView />;
}

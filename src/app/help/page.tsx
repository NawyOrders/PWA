import type { Metadata } from "next";
import { HelpView } from "@/components/help-view";

export const metadata: Metadata = {
  title: "المساعدة والدعم",
};

export default function HelpPage() {
  return <HelpView />;
}

import type { Metadata } from "next";
import { FaqView } from "@/components/faq-view";

export const metadata: Metadata = {
  title: "الاسئلة الشائعة",
};

export default function FaqPage() {
  return <FaqView />;
}

import type { Metadata } from "next";
import { FeedbackView } from "@/components/feedback-view";

export const metadata: Metadata = {
  title: "ارسال الملاحظات",
};

export default function FeedbackPage() {
  return <FeedbackView />;
}

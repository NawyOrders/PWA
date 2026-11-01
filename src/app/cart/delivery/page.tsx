import type { Metadata } from "next";
import { DeliveryExperience } from "@/components/cart/delivery-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "بيانات التوصيل",
  description: "أكد عنوان التوصيل وبيانات التواصل لطلبك من ناوي أوردر.",
  path: "/cart/delivery",
  noIndex: true,
});

export default function DeliveryPage() {
  return <DeliveryExperience />;
}

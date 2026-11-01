import type { Metadata } from "next";
import { OrdersExperience } from "@/components/profile/orders-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "سجل الطلبات",
  description: "تابع طلبك الحالي وارجع لطلباتك السابقة في ناوي أوردر.",
  path: "/orders",
  noIndex: true,
});

export default function OrdersPage() {
  return <OrdersExperience />;
}

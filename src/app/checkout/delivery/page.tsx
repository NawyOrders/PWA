import type { Metadata } from "next";
import { DeliveryView } from "@/components/delivery-view";

export const metadata: Metadata = {
  title: "بيانات التوصيل",
};

export default function DeliveryPage() {
  return <DeliveryView />;
}

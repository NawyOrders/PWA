import type { Metadata } from "next";
import { OrdersView } from "@/components/orders-view";

export const metadata: Metadata = {
  title: "طلباتك",
};

export default function OrdersPage() {
  return <OrdersView />;
}

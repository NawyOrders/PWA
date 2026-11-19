import type { Metadata } from "next";
import { PickupView } from "@/components/pickup-view";

export const metadata: Metadata = {
  title: "طريقة الاستلام",
};

export default function PickupPage() {
  return <PickupView />;
}

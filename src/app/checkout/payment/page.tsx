import type { Metadata } from "next";
import { PaymentView } from "@/components/payment-view";

export const metadata: Metadata = {
  title: "الدفع",
};

export default function PaymentPage() {
  return <PaymentView />;
}

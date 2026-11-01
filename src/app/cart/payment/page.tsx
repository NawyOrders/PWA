import type { Metadata } from "next";
import { PaymentExperience } from "@/components/cart/payment-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "الدفع",
  description: "اختار طريقة الدفع وأكد طلبك من ناوي أوردر.",
  path: "/cart/payment",
  noIndex: true,
});

export default function PaymentPage() {
  return <PaymentExperience />;
}

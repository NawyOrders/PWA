import type { Metadata } from "next";
import { CartExperience } from "@/components/cart/cart-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "سلة الطلبات",
  description: "راجع أصناف طلبك من ناوي أوردر، عدّل الكميات، وكمّل الطلب بتوصيل سريع.",
  path: "/cart",
  noIndex: true,
});

export default function CartPage() {
  return <CartExperience />;
}

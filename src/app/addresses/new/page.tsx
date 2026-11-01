import type { Metadata } from "next";
import { AddressExperience } from "@/components/profile/address-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "إضافة عنوان جديد",
  description: "أضف عنوان توصيل جديد لطلبك من ناوي أوردر واحفظه لطلباتك القادمة.",
  path: "/addresses/new",
  noIndex: true,
});

export default function NewAddressPage() {
  return <AddressExperience />;
}

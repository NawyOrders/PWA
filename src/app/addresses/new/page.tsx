import type { Metadata } from "next";
import { AddressNewView } from "@/components/address-new-view";

export const metadata: Metadata = {
  title: "إضافة عنوان جديد",
};

export default function NewAddressPage() {
  return <AddressNewView />;
}

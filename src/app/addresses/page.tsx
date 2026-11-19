import type { Metadata } from "next";
import { AddressesView } from "@/components/addresses-view";

export const metadata: Metadata = {
  title: "العناوين المحفوظة",
};

export default function AddressesPage() {
  return <AddressesView />;
}

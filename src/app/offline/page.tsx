import type { Metadata } from "next";
import { OfflineView } from "@/components/offline-view";

export const metadata: Metadata = {
  title: "غير متصل بالإنترنت",
};

export default function OfflinePage() {
  return <OfflineView />;
}

import type { Metadata } from "next";
import { EditProfileView } from "@/components/edit-profile-view";

export const metadata: Metadata = {
  title: "تعديل الملف الشخصي",
};

export default function EditProfilePage() {
  return <EditProfileView />;
}

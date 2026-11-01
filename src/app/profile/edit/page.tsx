import type { Metadata } from "next";
import { EditProfileExperience } from "@/components/profile/edit-profile-experience";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "تعديل الملف الشخصي",
  description: "حدّث اسمك ورقم هاتفك وصورتك الشخصية في حسابك على ناوي أوردر.",
  path: "/profile/edit",
  noIndex: true,
});

export default function EditProfilePage() {
  return <EditProfileExperience />;
}

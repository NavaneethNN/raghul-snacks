import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { AdminSettings } from "@/components/admin-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  return <AdminSettings />;
}

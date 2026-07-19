import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { AdminShipping } from "@/components/admin-shipping";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  return <AdminShipping />;
}

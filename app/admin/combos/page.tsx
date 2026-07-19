import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { AdminCombos } from "@/components/admin-combos";

export const dynamic = "force-dynamic";

export default async function AdminCombosPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  return <AdminCombos />;
}

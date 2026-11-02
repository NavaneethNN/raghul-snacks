import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getAllPackagingBoxes } from "@/lib/packaging";
import { AdminPackaging } from "@/components/admin-packaging";

export const dynamic = "force-dynamic";

export default async function AdminPackagingPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
      redirect("/admin/login");
    }
  } catch {
    redirect("/admin/login");
  }

  const boxes = await getAllPackagingBoxes();

  return <AdminPackaging initialBoxes={boxes} />;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, desc } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { announcements } from "@/drizzle/schema";
import { AdminAnnouncements } from "@/components/admin-announcements";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  try {
    const db = getDb();
    const announcementList = await db
      .select()
      .from(announcements)
      .orderBy(asc(announcements.order), desc(announcements.createdAt));

    return <AdminAnnouncements announcements={announcementList} />;
  } catch (error) {
    console.error("Error loading announcements:", error);
    return <AdminAnnouncements announcements={[]} />;
  }
}

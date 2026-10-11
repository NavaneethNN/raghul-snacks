import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { contactMessages } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { AdminMessages } from "@/components/admin-messages";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  type MessageRow = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    adminReply: string | null;
    replyAt: string | null;
    read: boolean;
    createdAt: string;
  };
  let messages: MessageRow[] = [];
  try {
    const rows = await getDb()
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));

    messages = rows.map((r) => ({
      ...r,
      phone: r.phone ?? null,
      adminReply: r.adminReply ?? null,
      replyAt: r.replyAt ? r.replyAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load messages.";
    console.error("Error loading messages:", message);
  }

  return <AdminMessages messages={messages} />;
}

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

  try {
    const rows = await getDb()
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));

    const messages = rows.map((r) => ({
      ...r,
      phone: r.phone ?? null,
      adminReply: r.adminReply ?? null,
      replyAt: r.replyAt ? r.replyAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));

    return <AdminMessages messages={messages} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load messages.";
    return (
      <section style={{ padding: "48px", textAlign: "center" }}>
        <p style={{ color: "var(--terracotta)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", marginBottom: "12px" }}>Error</p>
        <h1 style={{ fontSize: "32px", marginBottom: "12px" }}>Messages couldn&apos;t load.</h1>
        <p style={{ color: "#6b7280" }}>{message}</p>
      </section>
    );
  }
}

import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { contactMessages } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/messages/mine
// Returns contact messages submitted by the logged-in user's email.
export async function GET() {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ messages: [] });

  const rows = await getDb()
    .select({
      id: contactMessages.id,
      subject: contactMessages.subject,
      message: contactMessages.message,
      adminReply: contactMessages.adminReply,
      replyAt: contactMessages.replyAt,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .where(eq(contactMessages.email, session.email))
    .orderBy(desc(contactMessages.createdAt));

  return NextResponse.json({
    messages: rows.map((r) => ({
      ...r,
      adminReply: r.adminReply ?? null,
      replyAt: r.replyAt ? r.replyAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

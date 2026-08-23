import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { contactMessages } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

async function auth() {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(adminCookieName())?.value);
}

// PATCH /api/admin/messages/[id]
// Body: { read?: boolean; adminReply?: string }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { read?: boolean; adminReply?: string };

  const update: Record<string, unknown> = {};
  if (body.read !== undefined) update.read = body.read;
  if (body.adminReply !== undefined) {
    update.adminReply = body.adminReply.trim() || null;
    update.replyAt = body.adminReply.trim() ? new Date() : null;
    // auto-mark as read when admin replies
    if (body.adminReply.trim()) update.read = true;
  }

  await getDb().update(contactMessages).set(update).where(eq(contactMessages.id, Number(id)));
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/messages/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await getDb().delete(contactMessages).where(eq(contactMessages.id, Number(id)));
  return NextResponse.json({ success: true });
}

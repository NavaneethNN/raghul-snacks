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

// PATCH /api/admin/messages/[id] — toggle read status
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { read: boolean };
  await getDb().update(contactMessages).set({ read: body.read }).where(eq(contactMessages.id, Number(id)));
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/messages/[id]
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await getDb().delete(contactMessages).where(eq(contactMessages.id, Number(id)));
  return NextResponse.json({ success: true });
}

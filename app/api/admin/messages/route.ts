import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { contactMessages } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

async function auth() {
  const cookieStore = await cookies();
  return isValidAdminSession(cookieStore.get(adminCookieName())?.value);
}

// GET /api/admin/messages — all messages, newest first
export async function GET() {
  if (!await auth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await getDb()
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt));
  return NextResponse.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { asc, desc } from "drizzle-orm";
import { announcements } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all announcements
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await db.select().from(announcements).orderBy(asc(announcements.order), desc(announcements.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

// POST - Create new announcement
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text, icon, active, order } = body;

    const db = getDb();
    const [newAnnouncement] = await db.insert(announcements).values({
      text,
      icon: icon || null,
      active: active !== undefined ? active : true,
      order: order || 0,
    }).returning();

    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

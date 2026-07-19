import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { announcements } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List active announcements (public endpoint)
export async function GET() {
  try {
    const db = getDb();
    const result = await db
      .select({
        id: announcements.id,
        text: announcements.text,
        icon: announcements.icon,
      })
      .from(announcements)
      .where(eq(announcements.active, true))
      .orderBy(asc(announcements.order));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json([]);
  }
}

import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { announcements } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getOrSetCache } from "@/lib/cache";

export const revalidate = 300;

// GET - List active announcements (public endpoint)
export async function GET() {
  try {
    const data = await getOrSetCache("api:announcements", 300, async () => {
      const db = getDb();
      return await db
        .select({
          id: announcements.id,
          text: announcements.text,
          icon: announcements.icon,
        })
        .from(announcements)
        .where(eq(announcements.active, true))
        .orderBy(asc(announcements.order));
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json([]);
  }
}

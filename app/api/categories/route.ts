import { NextResponse } from "next/server";
import { categories } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getOrSetCache } from "@/lib/cache";

export const revalidate = 300;

// GET - List all categories (public endpoint)
export async function GET() {
  try {
    const data = await getOrSetCache("api:categories", 300, async () => {
      const db = getDb();
      return await db.select().from(categories);
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

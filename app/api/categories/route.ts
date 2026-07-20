import { NextResponse } from "next/server";
import { categories } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all categories (public endpoint)
export async function GET() {
  try {
    const db = getDb();
    const result = await db.select().from(categories);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

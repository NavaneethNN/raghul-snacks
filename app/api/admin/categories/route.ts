import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { categories } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all categories
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const result = await db.select().from(categories).orderBy(desc(categories.createdAt));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, slug, description, image } = body;

    const categorySlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const db = getDb();
    const [newCategory] = await db.insert(categories).values({
      name,
      slug: categorySlug,
      description: description || null,
      image: image || null,
    }).returning();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

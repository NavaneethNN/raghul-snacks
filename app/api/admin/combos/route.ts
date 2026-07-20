import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { combos } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

// GET - Fetch all combos
export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const allCombos = await db
      .select()
      .from(combos)
      .orderBy(desc(combos.createdAt));

    return NextResponse.json(allCombos);
  } catch (error) {
    console.error("Error fetching combos:", error);
    return NextResponse.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}

// POST - Create new combo
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, price, discount, image } = body;

    if (!title || !slug || !price) {
      return NextResponse.json(
        { error: "Title, slug, and price are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [newCombo] = await db
      .insert(combos)
      .values({
        title,
        slug,
        price: price.toString(),
        discount: discount ? discount.toString() : "0",
        image: image || null,
      })
      .returning();

    return NextResponse.json(newCombo, { status: 201 });
  } catch (error) {
    console.error("Error creating combo:", error);
    return NextResponse.json({ error: "Failed to create combo" }, { status: 500 });
  }
}

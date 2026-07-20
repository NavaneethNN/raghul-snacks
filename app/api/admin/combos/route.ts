import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { combos, comboItems, products } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

// GET - Fetch all combos with their items
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

    // Fetch items for each combo
    const combosWithItems = await Promise.all(
      allCombos.map(async (combo) => {
        const items = await db
          .select({
            id: comboItems.id,
            productId: comboItems.productId,
            quantity: comboItems.quantity,
            productName: products.name,
          })
          .from(comboItems)
          .leftJoin(products, eq(comboItems.productId, products.id))
          .where(eq(comboItems.comboId, combo.id));

        return { ...combo, items };
      })
    );

    return NextResponse.json(combosWithItems);
  } catch (error) {
    console.error("Error fetching combos:", error);
    return NextResponse.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}

// POST - Create new combo with items
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, price, discount, image, items } = body;

    if (!title || !slug || !price) {
      return NextResponse.json(
        { error: "Title, slug, and price are required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one product is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Create combo
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

    // Add combo items
    await db.insert(comboItems).values(
      items.map((item: { productId: number; quantity: number }) => ({
        comboId: newCombo.id,
        productId: item.productId,
        quantity: item.quantity,
      }))
    );

    return NextResponse.json(newCombo, { status: 201 });
  } catch (error) {
    console.error("Error creating combo:", error);
    return NextResponse.json({ error: "Failed to create combo" }, { status: 500 });
  }
}

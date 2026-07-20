import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { combos, comboItems, products } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

// GET - Fetch all active combos with their items (public endpoint)
export async function GET() {
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
            name: products.name,
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

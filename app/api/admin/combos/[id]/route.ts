import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { combos, comboItems } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH - Update combo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { title, slug, price, offerPrice, image, items } = body;

    if (!title || !slug || !price) {
      return NextResponse.json(
        { error: "Title, slug, and price are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Update combo
    await db
      .update(combos)
      .set({
        title,
        slug,
        price: price.toString(),
        discount: offerPrice ? offerPrice.toString() : "0",
        image: image || null,
      })
      .where(eq(combos.id, id));

    // Delete existing combo items and insert new ones
    if (items && items.length > 0) {
      await db.delete(comboItems).where(eq(comboItems.comboId, id));
      await db.insert(comboItems).values(
        items.map((item: { productId: number; quantity: number }) => ({
          comboId: id,
          productId: item.productId,
          quantity: item.quantity,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating combo:", error);
    return NextResponse.json({ error: "Failed to update combo" }, { status: 500 });
  }
}

// DELETE - Delete combo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = parseInt(params.id);
    const db = getDb();

    await db.delete(combos).where(eq(combos.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting combo:", error);
    return NextResponse.json({ error: "Failed to delete combo" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, like } from "drizzle-orm";
import { products, comboItems, orderItems, reviews, cartItems, categories } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PATCH - Update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.ingredients !== undefined) updateData.ingredients = body.ingredients;
    if (body.price !== undefined) updateData.price = body.price.toString();
    if (body.offerPrice !== undefined) updateData.offerPrice = body.offerPrice ? body.offerPrice.toString() : null;
    if (body.weight !== undefined) updateData.weight = body.weight;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.bestseller !== undefined) updateData.bestseller = body.bestseller;
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.shelfLife !== undefined) updateData.shelfLife = body.shelfLife || null;

    const db = getDb();
    // Validate categoryId exists before updating
    if (updateData.categoryId !== undefined && updateData.categoryId !== null) {
      const cat = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, updateData.categoryId)).limit(1);
      if (!cat[0]) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    invalidateCache("home:products");
    invalidateCache("shop:products");

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const db = getDb();

    // Remove references in child tables that don't cascade
    await db.delete(cartItems).where(like(cartItems.productId, `${id}%`));
    await db.delete(comboItems).where(eq(comboItems.productId, id));
    await db.update(orderItems).set({ productId: null }).where(eq(orderItems.productId, id));
    await db.update(reviews).set({ productId: null }).where(eq(reviews.productId, id));

    // Now delete the product (productVariants cascade automatically)
    await db.delete(products).where(eq(products.id, id));

    invalidateCache("home:products");
    invalidateCache("shop:products");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

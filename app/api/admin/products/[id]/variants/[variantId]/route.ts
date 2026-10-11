import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cartItems, productVariants } from "@/drizzle/schema";
import { isValidAdminSession, adminCookieName } from "@/lib/admin-auth";
import { cookies } from "next/headers";

async function guard() {
  const cookieStore = await cookies();
  const session = cookieStore.get(adminCookieName())?.value;
  if (!isValidAdminSession(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// PATCH /api/admin/products/[id]/variants/[variantId]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const unauth = await guard();
  if (unauth) return unauth;
  const { id, variantId } = await params;
  const productId = parseInt(id);
  const vId = parseInt(variantId);
  if (isNaN(productId) || isNaN(vId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const body = await req.json() as { weight?: string; price?: number; offerPrice?: number | null; sortOrder?: number; active?: boolean };
  const db = getDb();
  const [updated] = await db.update(productVariants).set({
    ...(body.weight !== undefined ? { weight: body.weight.trim() } : {}),
    ...(body.price !== undefined ? { price: String(body.price) } : {}),
    ...(body.offerPrice !== undefined ? { offerPrice: body.offerPrice ? String(body.offerPrice) : null } : {}),
    ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
  }).where(and(eq(productVariants.id, vId), eq(productVariants.productId, productId))).returning();
  if (!updated) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/admin/products/[id]/variants/[variantId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; variantId: string }> }) {
  const unauth = await guard();
  if (unauth) return unauth;
  const { id, variantId } = await params;
  const productId = parseInt(id);
  const vId = parseInt(variantId);
  if (isNaN(productId) || isNaN(vId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  const db = getDb();
  // Remove cart items referencing this specific variant
  await db.delete(cartItems).where(eq(cartItems.productId, `${productId}-v${vId}`));
  await db.delete(productVariants).where(and(eq(productVariants.id, vId), eq(productVariants.productId, productId)));
  return NextResponse.json({ ok: true });
}

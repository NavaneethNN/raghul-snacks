import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { cartItems, products } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// ── helpers ─────────────────────────────────────────────────────────────────

async function getSession() {
  const cookieStore = await cookies();
  return getCustomerSession(cookieStore.get(customerCookieName())?.value);
}

// ── GET /api/cart ────────────────────────────────────────────────────────────
// Returns the logged-in user's saved cart rows, enriched with product data.
// Response: { items: Array<{ productId, quantity, product: Product | null }> }
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] });

  const db = getDb();
  const rows = await db
    .select({ productId: cartItems.productId, quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.accountId, session.id));

  if (!rows.length) return NextResponse.json({ items: [] });

  // Fetch product details for numeric IDs (DB products use integer IDs stored as text)
  const numericIds = rows.map((r) => Number(r.productId)).filter((n) => !Number.isNaN(n));
  const productRows = numericIds.length
    ? await db.select().from(products).where(inArray(products.id, numericIds))
    : [];

  const productMap = new Map(productRows.map((p) => [String(p.id), p]));

  const enriched = rows.map((row) => ({
    productId: row.productId,
    quantity: row.quantity,
    product: productMap.get(row.productId) ?? null,
  }));

  return NextResponse.json({ items: enriched });
}

// ── POST /api/cart ────────────────────────────────────────────────────────────
// Upserts one or many cart items for the logged-in user.
// Body: { items: Array<{ productId: string; quantity: number }> }
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json() as { items?: Array<{ productId: string; quantity: number }> };
  if (!Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: "items array is required." }, { status: 400 });
  }

  const db = getDb();

  // Upsert each item — insert or update quantity + updatedAt on conflict
  await Promise.all(
    body.items.map((item) =>
      db
        .insert(cartItems)
        .values({ accountId: session.id, productId: item.productId, quantity: item.quantity, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [cartItems.accountId, cartItems.productId],
          set: { quantity: item.quantity, updatedAt: new Date() },
        })
    )
  );

  return NextResponse.json({ success: true });
}

// ── DELETE /api/cart ──────────────────────────────────────────────────────────
// Removes a single item or clears the whole cart.
// Body: { productId?: string }  — omit productId to clear all
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { productId?: string };
  const db = getDb();

  if (body.productId) {
    await db.delete(cartItems).where(
      and(eq(cartItems.accountId, session.id), eq(cartItems.productId, body.productId))
    );
  } else {
    // Clear entire cart
    await db.delete(cartItems).where(eq(cartItems.accountId, session.id));
  }

  return NextResponse.json({ success: true });
}

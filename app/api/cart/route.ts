import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { cartItems, combos, products, productVariants } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// ── helpers ─────────────────────────────────────────────────────────────────

async function getSession() {
  const cookieStore = await cookies();
  return getCustomerSession(cookieStore.get(customerCookieName())?.value);
}

// ── GET /api/cart ────────────────────────────────────────────────────────────
// Returns the logged-in user's saved cart rows, enriched with product/variant/combo data.
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

  // 1. Categorize cart item IDs
  const productBaseIds = new Set<number>();
  const variantIds = new Set<number>();
  const comboIds = new Set<number>();

  for (const row of rows) {
    const pid = row.productId;
    if (pid.startsWith("combo-")) {
      const cid = parseInt(pid.slice(6));
      if (!isNaN(cid)) comboIds.add(cid);
    } else {
      const vMatch = pid.match(/^(\d+)-v(\d+)$/);
      if (vMatch) {
        productBaseIds.add(parseInt(vMatch[1]));
        variantIds.add(parseInt(vMatch[2]));
      } else {
        const id = Number(pid);
        if (!Number.isNaN(id)) productBaseIds.add(id);
      }
    }
  }

  // 2. Fetch products, variants, combos concurrently
  const [productRows, variantRows, comboRows] = await Promise.all([
    productBaseIds.size > 0
      ? db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            description: products.description,
            ingredients: products.ingredients,
            price: products.price,
            offerPrice: products.offerPrice,
            weight: products.weight,
            categoryId: products.categoryId,
            image: products.image,
            stock: products.stock,
            featured: products.featured,
            bestseller: products.bestseller,
          })
          .from(products)
          .where(inArray(products.id, [...productBaseIds]))
      : [],
    variantIds.size > 0
      ? db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.id, [...variantIds]))
      : [],
    comboIds.size > 0
      ? db
          .select()
          .from(combos)
          .where(inArray(combos.id, [...comboIds]))
      : [],
  ]);

  const baseProductMap = new Map(productRows.map((p) => [p.id, p]));
  const variantMap = new Map(variantRows.map((v) => [v.id, v]));
  const comboMap = new Map(comboRows.map((c) => [c.id, c]));

  // 3. Build enriched products map keyed by cart productId (e.g. "6", "6-v12", "combo-1")
  const productMap = new Map<string, any>();

  for (const row of rows) {
    const pid = row.productId;
    if (pid.startsWith("combo-")) {
      const cid = parseInt(pid.slice(6));
      const c = comboMap.get(cid);
      if (c) {
        const offerPrice = c.discount && parseFloat(c.discount) > 0 ? c.discount : c.price;
        productMap.set(pid, {
          id: pid,
          name: c.title,
          slug: c.slug,
          description: c.description || "",
          ingredients: "",
          price: c.price,
          offerPrice,
          weight: "Combo",
          categoryId: null,
          image: c.image,
          stock: 1,
          featured: false,
          bestseller: false,
        });
      }
    } else {
      const vMatch = pid.match(/^(\d+)-v(\d+)$/);
      if (vMatch) {
        const baseId = parseInt(vMatch[1]);
        const varId = parseInt(vMatch[2]);
        const p = baseProductMap.get(baseId);
        const v = variantMap.get(varId);
        if (p && v) {
          productMap.set(pid, {
            id: pid,
            name: p.name,
            slug: p.slug,
            description: p.description,
            ingredients: p.ingredients,
            price: v.price,
            offerPrice: v.offerPrice || v.price,
            weight: v.weight,
            categoryId: p.categoryId,
            image: p.image,
            stock: p.stock,
            featured: p.featured,
            bestseller: p.bestseller,
          });
        }
      } else {
        const id = Number(pid);
        const p = baseProductMap.get(id);
        if (p) {
          productMap.set(pid, p);
        }
      }
    }
  }

  // Auto-clean stale cart rows where product/combo no longer exists
  const staleIds = rows
    .filter((row) => !productMap.has(row.productId))
    .map((row) => row.productId);
  if (staleIds.length > 0) {
    // Delete stale rows in background (don't await to keep response fast)
    Promise.all(
      staleIds.map((pid) =>
        db.delete(cartItems).where(and(eq(cartItems.accountId, session.id), eq(cartItems.productId, pid)))
      )
    ).catch(() => {});
  }

  const enriched = rows
    .filter((row) => productMap.has(row.productId))
    .map((row) => ({
      productId: row.productId,
      quantity: row.quantity,
      product: productMap.get(row.productId)!,
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

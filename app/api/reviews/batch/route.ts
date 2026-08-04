import { and, eq, inArray, or, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { orderItems, orders, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// POST /api/reviews/batch
// Body: { productIds: number[] }
// Returns: Record<productId, { canReview: boolean; existingRating: number }>
// A productId absent from the response means the user hasn't purchased it.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({});

  const { productIds } = await request.json() as { productIds: number[] };
  if (!productIds?.length) return NextResponse.json({});

  const db = getDb();

  // 1. Resolve product names so we can match order_items that have product_id = null
  const productRows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(inArray(products.id, productIds));

  // map: productId → name
  const idToName = new Map(productRows.map((p) => [p.id, p.name]));
  // map: name → productId (for reverse lookup)
  const nameToId = new Map(productRows.map((p) => [p.name, p.id]));

  // 2. Fetch ALL paid order_items for this account (both by productId and by name)
  const allPurchasedItems = await db
    .select({ productId: orderItems.productId, name: orderItems.name })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.accountId, session.id),
        eq(orders.paymentStatus, "paid"),
      ),
    );

  // Build set of purchased productIds — matching by product_id OR by name fallback
  const purchasedIds = new Set<number>();
  for (const row of allPurchasedItems) {
    if (row.productId && productIds.includes(row.productId)) {
      purchasedIds.add(row.productId);
    } else if (!row.productId && row.name) {
      // product_id is null on older orders — match by name
      const pid = nameToId.get(row.name);
      if (pid && productIds.includes(pid)) purchasedIds.add(pid);
    }
  }

  if (purchasedIds.size === 0) return NextResponse.json({});

  // 3. Fetch existing reviews by this user for purchased products
  const existingReviews = await db
    .select({ productId: reviews.productId, rating: reviews.rating })
    .from(reviews)
    .where(
      and(
        eq(reviews.accountId, session.id),
        inArray(reviews.productId, [...purchasedIds]),
      ),
    );

  const reviewedMap = new Map(
    existingReviews
      .filter((r) => r.productId !== null)
      .map((r) => [r.productId!, r.rating])
  );

  // 4. Build response
  const result: Record<number, { canReview: boolean; existingRating: number }> = {};
  for (const pid of purchasedIds) {
    const existingRating = reviewedMap.get(pid) ?? 0;
    result[pid] = { canReview: existingRating === 0, existingRating };
  }

  return NextResponse.json(result);
}

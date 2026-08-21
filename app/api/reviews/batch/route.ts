import { and, eq, inArray, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { orderItems, orders, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// POST /api/reviews/batch
// Body: { productIds: number[], orderId: number }
// Returns: Record<productId, {
//   canReview: boolean;       // this order has no review yet
//   canEdit: boolean;         // most-recent order AND product reviewed in a prior order
//   existingRating: number;   // rating of prior review (for edit pre-fill)
//   priorOrderId?: number;    // orderId of the prior review (used when submitting PATCH)
// }>
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({});

  const { productIds, orderId } = await request.json() as {
    productIds: number[];
    orderId: number;
  };
  if (!productIds?.length || !orderId) return NextResponse.json({});

  const db = getDb();

  // 1. Resolve product names for name-based matching (old orders have product_id=null)
  const productRows = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(inArray(products.id, productIds));
  const idToName = new Map(productRows.map((p) => [p.id, p.name]));
  const nameToId = new Map(productRows.map((p) => [p.name, p.id]));

  // 2. Find all paid orders for this account, ordered newest first
  const allOrders = await db
    .select({ id: orders.id, createdAt: orders.createdAt })
    .from(orders)
    .where(and(eq(orders.accountId, session.id), eq(orders.paymentStatus, "paid")));

  allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const mostRecentOrderId = allOrders[0]?.id;
  const isCurrentOrderMostRecent = orderId === mostRecentOrderId;

  // 3. Fetch all order items across all paid orders for this account
  const allOrderIds = allOrders.map((o) => o.id);
  if (!allOrderIds.length) return NextResponse.json({});

  const allItems = await db
    .select({ orderId: orderItems.orderId, productId: orderItems.productId, name: orderItems.name })
    .from(orderItems)
    .where(inArray(orderItems.orderId, allOrderIds));

  // Build map: productId → set of orderIds that contain it
  const productOrderMap = new Map<number, Set<number>>();
  for (const item of allItems) {
    let pid = item.productId;
    if (!pid && item.name) pid = nameToId.get(item.name) ?? null;
    if (!pid) continue;
    if (!productOrderMap.has(pid)) productOrderMap.set(pid, new Set());
    productOrderMap.get(pid)!.add(item.orderId);
  }

  // 4. Fetch all reviews by this user
  const allReviews = await db
    .select({ productId: reviews.productId, orderId: reviews.orderId, rating: reviews.rating })
    .from(reviews)
    .where(eq(reviews.accountId, session.id));

  // Map: productId+orderId → rating
  const reviewMap = new Map<string, number>();
  for (const r of allReviews) {
    if (r.productId && r.orderId) {
      // Normal case — review tied to specific order
      reviewMap.set(`${r.productId}-${r.orderId}`, r.rating);
    } else if (r.productId) {
      // Legacy review with order_id=null — associate with the OLDEST order containing this product
      // so it counts as a "prior review" for repurchase detection
      const ordersWithProduct = [...(productOrderMap.get(r.productId) ?? [])];
      ordersWithProduct.sort((a, b) => a - b); // ascending = oldest first
      const oldestOrderId = ordersWithProduct[0];
      if (oldestOrderId) {
        reviewMap.set(`${r.productId}-${oldestOrderId}`, r.rating);
      }
    }
  }

  // 5. Build result for each requested productId
  const result: Record<number, { canReview: boolean; canEdit: boolean; existingRating: number; priorOrderId?: number }> = {};

  for (const pid of productIds) {
    const orderIdsWithProduct = productOrderMap.get(pid);
    if (!orderIdsWithProduct || !orderIdsWithProduct.has(orderId)) continue;
    // User purchased this product in the current order

    const thisOrderReviewKey = `${pid}-${orderId}`;
    const hasReviewedThisOrder = reviewMap.has(thisOrderReviewKey);

    // Find if there's a review from a PREVIOUS order (for edit eligibility)
    const priorOrderReview = [...orderIdsWithProduct]
      .filter((oid) => oid !== orderId && reviewMap.has(`${pid}-${oid}`))
      .map((oid) => reviewMap.get(`${pid}-${oid}`)!)[0];
    const hasPriorReview = priorOrderReview !== undefined;

    // canReview: no review yet for this specific order
    const canReview = !hasReviewedThisOrder;

    // canEdit: most recent order, product was in a prior order with a review, no review yet for current order
    const canEdit = isCurrentOrderMostRecent && hasPriorReview && !hasReviewedThisOrder;

    // Find the prior orderId that has the review (needed for edit submission)
    const priorOrderId = [...orderIdsWithProduct]
      .filter((oid) => oid !== orderId && reviewMap.has(`${pid}-${oid}`))[0];

    result[pid] = {
      canReview,
      canEdit,
      existingRating: priorOrderReview ?? 0,
      priorOrderId,
    };
  }

  return NextResponse.json(result);
}

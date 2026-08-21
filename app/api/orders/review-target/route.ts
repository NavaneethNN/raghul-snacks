import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { orders, orderItems, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/orders/review-target
// Returns the URL to open the review form for the first unreviewed product
// in the most recent delivered order.
// Response: { href: string } or { href: null }
export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    if (!session) return NextResponse.json({ href: null });

    const db = getDb();

    // Find the most recent delivered+paid order
    const deliveredOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.accountId, session.id), eq(orders.orderStatus, "delivered"), eq(orders.paymentStatus, "paid")))
      .orderBy(orders.createdAt);

    if (!deliveredOrders.length) return NextResponse.json({ href: null });

    // Walk orders newest-first to find one with an unreviewed product
    for (const order of deliveredOrders.reverse()) {
      const items = await db
        .select({ productId: orderItems.productId, name: orderItems.name })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      // Resolve product slugs
      const productIds = items.map((i) => i.productId).filter(Boolean) as number[];
      if (!productIds.length) continue;

      const productRows = await db
        .select({ id: products.id, slug: products.slug, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds));

      // Find products not yet reviewed for this order
      const existingReviews = await db
        .select({ productId: reviews.productId })
        .from(reviews)
        .where(and(eq(reviews.orderId, order.id), eq(reviews.accountId, session.id)));

      const reviewedIds = new Set(existingReviews.map((r) => r.productId));

      const unreviewed = productRows.find((p) => !reviewedIds.has(p.id));
      if (unreviewed) {
        return NextResponse.json({
          href: `/product/${unreviewed.slug}?writeReview=1&orderId=${order.id}#reviews`,
        });
      }
    }

    return NextResponse.json({ href: null });
  } catch {
    return NextResponse.json({ href: null });
  }
}

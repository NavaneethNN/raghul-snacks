import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { orders, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/reviews/mine?productId=123
// Returns the logged-in user's most recent review for a product, if any.
// Response: { review: { id, orderId, rating, content } | null }
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ review: null });

  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!productId) return NextResponse.json({ review: null });

  const db = getDb();

  // Get the user's most recent review for this product
  const row = (await db
    .select({
      id: reviews.id,
      orderId: reviews.orderId,
      rating: reviews.rating,
      content: reviews.content,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)))
    .orderBy(desc(reviews.id))
    .limit(1))[0] ?? null;

  if (!row) return NextResponse.json({ review: null });

  // Verify the order still belongs to this account (security check)
  if (row.orderId) {
    const order = (await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.id, row.orderId), eq(orders.accountId, session.id)))
      .limit(1))[0];
    if (!order) return NextResponse.json({ review: null });
  }

  return NextResponse.json({ review: row });
}

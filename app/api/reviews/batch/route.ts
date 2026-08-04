import { and, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts, orderItems, orders, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// POST /api/reviews/batch
// Body: { productIds: number[] }
// Returns: Record<productId, { canReview: boolean; existingRating: number }>
// productId not in response = user has not purchased it (hide review option)
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({}, { status: 200 }); // guest — no review eligibility

  const { productIds } = await request.json() as { productIds: number[] };
  if (!productIds?.length) return NextResponse.json({});

  const db = getDb();

  // 1. Get all paid order items for this account that match the requested productIds
  const purchasedRows = await db
    .select({ productId: orderItems.productId, name: orderItems.name })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.accountId, session.id),
        eq(orders.paymentStatus, "paid"),
      ),
    );

  // Build a set of purchased productIds (by id and by name fallback)
  const purchasedByIdSet = new Set(
    purchasedRows.map((r) => r.productId).filter(Boolean) as number[]
  );

  // 2. Get all existing reviews by this user for these products
  const existingReviews = await db
    .select({ productId: reviews.productId, rating: reviews.rating })
    .from(reviews)
    .where(
      and(
        eq(reviews.accountId, session.id),
        inArray(reviews.productId, productIds),
      ),
    );

  const reviewedMap = new Map(
    existingReviews
      .filter((r) => r.productId !== null)
      .map((r) => [r.productId!, r.rating])
  );

  // 3. Build response — only include products the user has purchased
  const result: Record<number, { canReview: boolean; existingRating: number }> = {};

  for (const pid of productIds) {
    const hasPurchased = purchasedByIdSet.has(pid);
    if (!hasPurchased) continue; // not purchased — omit from response

    const existingRating = reviewedMap.get(pid) ?? 0;
    result[pid] = {
      canReview: existingRating === 0,
      existingRating,
    };
  }

  return NextResponse.json(result);
}

import { and, desc, eq, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts, orderItems, orders, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/reviews/eligibility?productId=123
// Returns whether the currently logged in user is eligible to write a review.
// Requirements:
// 1. User must be logged in.
// 2. User must not have already reviewed this product.
// 3. User must have an order containing this product that has been DELIVERED.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = Number(searchParams.get("productId"));

  if (!productId || isNaN(productId)) {
    return NextResponse.json({ canReview: false, reason: "invalid_product" });
  }

  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);

  if (!session) {
    return NextResponse.json({ canReview: false, reason: "not_logged_in" });
  }

  const db = getDb();

  // 1. Check if user already reviewed this product
  const existingReview = (
    await db
      .select({ id: reviews.id, rating: reviews.rating })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)))
      .limit(1)
  )[0];

  if (existingReview) {
    return NextResponse.json({
      canReview: false,
      alreadyReviewed: true,
      existingRating: existingReview.rating,
      reason: "already_reviewed",
    });
  }

  // 2. Get product details (name) to match by ID or name
  const prod = (
    await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
  )[0];

  if (!prod) {
    return NextResponse.json({ canReview: false, reason: "product_not_found" });
  }

  // 3. Check if user has an order containing this product that has been DELIVERED
  const qualifyingOrder = (
    await db
      .select({ id: orders.id, orderNumber: orders.orderNumber })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.accountId, session.id),
          eq(orders.orderStatus, "delivered"),
          or(eq(orderItems.productId, productId), eq(orderItems.name, prod.name))
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(1)
  )[0];

  if (!qualifyingOrder) {
    return NextResponse.json({
      canReview: false,
      alreadyReviewed: false,
      reason: "not_delivered",
    });
  }

  // Fetch customer account name if available
  const account = (
    await db
      .select({ name: customerAccounts.name })
      .from(customerAccounts)
      .where(eq(customerAccounts.id, session.id))
      .limit(1)
  )[0];

  return NextResponse.json({
    canReview: true,
    alreadyReviewed: false,
    orderId: qualifyingOrder.id,
    customerName: account?.name || "",
  });
}


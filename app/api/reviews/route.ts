import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts, orderItems, orders, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/reviews?productId=123
// Returns all reviews for public display on the product page.
export async function GET(request: NextRequest) {
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  const db = getDb();

  const allReviews = await db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      rating: reviews.rating,
      content: reviews.content,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(eq(reviews.productId, productId))
    .orderBy(desc(reviews.createdAt));

  return NextResponse.json({
    reviews: allReviews.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  });
}

// POST /api/reviews
// Body: { productId, rating, content }
// Submits a new review; server finds the most recent paid order containing this product.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const body = await request.json() as { productId: number; rating: number; content: string };
  const { productId, rating, content } = body;

  if (!productId || !rating || !content?.trim()) {
    return NextResponse.json({ error: "Product, rating and review text are required." }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const db = getDb();

  // Find the product name for fallback matching
  const product = (await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1))[0];

  // Find the most recent paid order for this user that contains this product (by productId)
  const orderByProductId = (await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.accountId, session.id),
        eq(orders.paymentStatus, "paid"),
        eq(orderItems.productId, productId)
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(1))[0];

  // Fallback: match by product name if productId link is missing
  const orderByName =
    !orderByProductId && product?.name
      ? (await db
          .select({ id: orders.id })
          .from(orders)
          .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
          .where(
            and(
              eq(orders.accountId, session.id),
              eq(orders.paymentStatus, "paid"),
              eq(orderItems.name, product.name)
            )
          )
          .orderBy(desc(orders.createdAt))
          .limit(1))[0]
      : undefined;

  const qualifyingOrder = orderByProductId ?? orderByName;
  if (!qualifyingOrder) {
    return NextResponse.json({ error: "You must purchase this product before reviewing." }, { status: 403 });
  }

  // Prevent duplicate review for this user+product (regardless of order)
  const existing = await db.select({ id: reviews.id }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "You have already reviewed this product." }, { status: 409 });
  }

  const account = (await db.select({ name: customerAccounts.name }).from(customerAccounts)
    .where(eq(customerAccounts.id, session.id)).limit(1))[0];

  await db.insert(reviews).values({
    productId,
    orderId: qualifyingOrder.id,
    accountId: session.id,
    customerName: account?.name ?? "Customer",
    rating,
    content: content.trim(),
    approved: true,
  });

  return NextResponse.json({ success: true });
}



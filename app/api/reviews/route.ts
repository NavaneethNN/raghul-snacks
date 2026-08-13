import { and, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts, orderItems, orders, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/reviews?productId=123
// Returns approved reviews for public display on the product page.
export async function GET(request: NextRequest) {
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  const db = getDb();

  const approvedReviews = await db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      rating: reviews.rating,
      content: reviews.content,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.approved, true)))
    .orderBy(desc(reviews.createdAt));

  return NextResponse.json({
    reviews: approvedReviews.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  });
}

// POST /api/reviews
// Body: { productId, orderId, rating, content }
// Submits a new review for a specific order+product.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Sign in to leave a review." }, { status: 401 });

  const body = await request.json() as { productId: number; orderId: number; rating: number; content: string };
  const { productId, orderId, rating, content } = body;

  if (!productId || !orderId || !rating || !content?.trim()) {
    return NextResponse.json({ error: "Product, order, rating and review text are required." }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const db = getDb();

  // Verify the order belongs to this user and is paid
  const order = (await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.accountId, session.id), eq(orders.paymentStatus, "paid")))
    .limit(1))[0];
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 403 });

  // Verify the product was in this order (by productId or name)
  const product = (await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1))[0];
  const itemById = await db.select({ id: orderItems.id }).from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.productId, productId))).limit(1);
  const itemByName = itemById.length === 0 && product?.name
    ? await db.select({ id: orderItems.id }).from(orderItems)
        .where(and(eq(orderItems.orderId, orderId), eq(orderItems.name, product.name))).limit(1)
    : [];
  if (itemById.length === 0 && itemByName.length === 0) {
    return NextResponse.json({ error: "This product was not in the specified order." }, { status: 403 });
  }

  // Prevent duplicate review for same order+product
  const existing = await db.select({ id: reviews.id }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id), eq(reviews.orderId, orderId)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "You have already reviewed this product for this order." }, { status: 409 });
  }

  const account = (await db.select({ name: customerAccounts.name }).from(customerAccounts)
    .where(eq(customerAccounts.id, session.id)).limit(1))[0];

  await db.insert(reviews).values({
    productId,
    orderId,
    accountId: session.id,
    customerName: account?.name ?? "Customer",
    rating,
    content: content.trim(),
    approved: false,
  });

  return NextResponse.json({ success: true });
}

// PATCH /api/reviews
// Body: { productId, orderId, rating, content }
// Edits a review for a specific order+product (repurchase edit scenario).
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Sign in to edit your review." }, { status: 401 });

  const body = await request.json() as { productId: number; orderId: number; rating: number; content: string };
  const { productId, orderId, rating, content } = body;

  if (!productId || !orderId || !rating || !content?.trim()) {
    return NextResponse.json({ error: "Product, order, rating and review text are required." }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const db = getDb();

  // Find the review for the specified prior order (not the current one)
  const existing = await db.select({ id: reviews.id }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id), eq(reviews.orderId, orderId)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "No existing review found to edit." }, { status: 404 });
  }

  await db.update(reviews)
    .set({ rating, content: content.trim(), approved: false })
    .where(eq(reviews.id, existing[0].id));

  return NextResponse.json({ success: true });
}

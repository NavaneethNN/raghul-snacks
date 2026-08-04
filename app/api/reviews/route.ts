import { and, count, desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts, orderItems, orders, products, reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/reviews?productId=123
// Returns: approved reviews, whether the logged-in user has purchased this
// product, and whether they have already submitted a review.
export async function GET(request: NextRequest) {
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!productId) return NextResponse.json({ error: "productId is required" }, { status: 400 });

  const db = getDb();

  // Fetch approved reviews for this product
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

  // Check session — guests cannot review
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);

  let canReview = false;
  let alreadyReviewed = false;
  let accountName = "";

  if (session) {
    // Has this user ordered this product?
    const product = (await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1))[0];
    const productName = product?.name ?? "";

    const purchaseRows = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.accountId, session.id),
          eq(orders.paymentStatus, "paid"),
          // Match by productId or by name (older orders have no productId)
          productId
            ? eq(orderItems.productId, productId)
            : eq(orderItems.name, productName),
        ),
      )
      .limit(1);

    // Also check by name in case productId is null on old orders
    const purchaseByName = purchaseRows.length === 0 && productName
      ? await db
          .select({ id: orderItems.id })
          .from(orderItems)
          .innerJoin(orders, eq(orderItems.orderId, orders.id))
          .where(
            and(
              eq(orders.accountId, session.id),
              eq(orders.paymentStatus, "paid"),
              eq(orderItems.name, productName),
            ),
          )
          .limit(1)
      : [];

    const hasPurchased = purchaseRows.length > 0 || purchaseByName.length > 0;

    if (hasPurchased) {
      // Has this user already reviewed this product?
      const existingReview = await db
        .select({ id: reviews.id, rating: reviews.rating })
        .from(reviews)
        .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)))
        .limit(1);

      alreadyReviewed = existingReview.length > 0;
      const existingRating = existingReview[0]?.rating ?? 0;
      canReview = !alreadyReviewed;

      const account = (await db.select({ name: customerAccounts.name }).from(customerAccounts).where(eq(customerAccounts.id, session.id)).limit(1))[0];
      accountName = account?.name ?? "";

      return NextResponse.json({
        reviews: approvedReviews.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toISOString() ?? null,
        })),
        canReview,
        alreadyReviewed,
        existingRating,
        accountName,
      });
    }
  }

  return NextResponse.json({
    reviews: approvedReviews.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
    canReview,
    alreadyReviewed,
    existingRating: 0,
    accountName,
  });
}

// POST /api/reviews
// Body: { productId, rating, content }
// Only for logged-in users who have purchased the product.
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
  if (content.trim().length < 1) {
    return NextResponse.json({ error: "Review cannot be empty." }, { status: 400 });
  }

  const db = getDb();

  // Re-verify purchase
  const product = (await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1))[0];
  const purchaseRows = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.accountId, session.id), eq(orders.paymentStatus, "paid"), eq(orderItems.productId, productId)))
    .limit(1);

  const purchaseByName = purchaseRows.length === 0 && product?.name
    ? await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(eq(orders.accountId, session.id), eq(orders.paymentStatus, "paid"), eq(orderItems.name, product.name)))
        .limit(1)
    : [];

  if (purchaseRows.length === 0 && purchaseByName.length === 0) {
    return NextResponse.json({ error: "You can only review products you have purchased." }, { status: 403 });
  }

  // Prevent duplicate reviews
  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)));
  if (Number(existing) > 0) {
    return NextResponse.json({ error: "You have already reviewed this product." }, { status: 409 });
  }

  const account = (await db.select({ name: customerAccounts.name }).from(customerAccounts).where(eq(customerAccounts.id, session.id)).limit(1))[0];

  await db.insert(reviews).values({
    productId,
    accountId: session.id,
    customerName: account?.name ?? "Customer",
    rating,
    content: content.trim(),
    approved: false,
  });

  return NextResponse.json({ success: true, message: "Thank you! Your review is pending approval." });
}

// PATCH /api/reviews
// Body: { productId, rating, content }
// Lets a logged-in purchaser update their existing review.
export async function PATCH(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Sign in to edit your review." }, { status: 401 });

  const body = await request.json() as { productId: number; rating: number; content: string };
  const { productId, rating, content } = body;

  if (!productId || !rating || !content?.trim()) {
    return NextResponse.json({ error: "Product, rating and review text are required." }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }

  const db = getDb();

  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "No existing review found to edit." }, { status: 404 });
  }

  await db
    .update(reviews)
    .set({ rating, content: content.trim(), approved: false })
    .where(eq(reviews.id, existing[0].id));

  return NextResponse.json({ success: true });
}

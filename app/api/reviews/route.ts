import { and, desc, eq, or } from "drizzle-orm";
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

  const allReviews = await db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      rating: reviews.rating,
      content: reviews.content,
      approved: reviews.approved,
      orderId: reviews.orderId,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.approved, true)))
    .orderBy(desc(reviews.createdAt));

  return NextResponse.json({
    reviews: allReviews.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      content: r.content,
      verifiedPurchase: Boolean(r.orderId),
      createdAt: r.createdAt?.toISOString() ?? null,
    })),
  });
}

// POST /api/reviews
// Body: { productId, rating, content, customerName? }
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);

  const body = (await request.json()) as {
    productId: number;
    rating: number;
    content: string;
    customerName?: string;
    orderId?: number;
  };
  const { productId, rating, content } = body;

  if (!productId || !rating || !content?.trim()) {
    return NextResponse.json(
      { error: "Product, rating, and review text are required." },
      { status: 400 }
    );
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5 stars." }, { status: 400 });
  }

  const db = getDb();

  // Verify product exists
  const product = (
    await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
  )[0];

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let accountName = "Verified Customer";
  let accountId: number | null = null;
  let qualifyingOrderId: number | null = null;

  if (!session) {
    return NextResponse.json(
      { error: "You must be signed in with a delivered purchase to review this snack." },
      { status: 401 }
    );
  }

  accountId = session.id;
  const account = (
    await db
      .select({ name: customerAccounts.name, email: customerAccounts.email })
      .from(customerAccounts)
      .where(eq(customerAccounts.id, session.id))
      .limit(1)
  )[0];

  if (account?.name) accountName = account.name;

  // Check duplicate review by this account for this product
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.accountId, session.id)))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "You have already reviewed this snack. Thank you!" },
      { status: 409 }
    );
  }

  // Check if user purchased this product in a DELIVERED order
  const qualifyingOrder = (
    await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.accountId, session.id),
          eq(orders.orderStatus, "delivered"),
          or(eq(orderItems.productId, productId), eq(orderItems.name, product.name))
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(1)
  )[0];

  if (!qualifyingOrder) {
    return NextResponse.json(
      { error: "Reviews are only available for snacks from orders that have been delivered to you." },
      { status: 403 }
    );
  }

  qualifyingOrderId = qualifyingOrder.id;

  const [newReview] = await db
    .insert(reviews)
    .values({
      productId,
      orderId: qualifyingOrderId,
      accountId,
      customerName: accountName,
      rating,
      content: content.trim(),
      approved: true,
    })
    .returning();

  return NextResponse.json({
    success: true,
    review: {
      id: newReview.id,
      customerName: newReview.customerName,
      rating: newReview.rating,
      content: newReview.content,
      verifiedPurchase: Boolean(qualifyingOrderId),
      createdAt: newReview.createdAt?.toISOString() ?? new Date().toISOString(),
    },
  });
}

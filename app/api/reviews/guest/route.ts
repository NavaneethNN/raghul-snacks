import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { orders, reviews } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json() as { orderNumber?: string; phone?: string; customerName?: string; rating?: number; content?: string };
  const { orderNumber, phone, customerName, rating, content } = body;

  if (!orderNumber || !phone || !customerName || !rating) {
    return NextResponse.json({ error: "Order number, phone, name and rating are required." }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (!/^RS-\d{8}$/i.test(orderNumber)) {
    return NextResponse.json({ error: "Invalid order number." }, { status: 400 });
  }

  const db = getDb();

  // Verify the order exists, belongs to this phone, and is delivered
  const order = await db
    .select({ id: orders.id, orderStatus: orders.orderStatus })
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber.toUpperCase()), eq(orders.phone, phone)))
    .limit(1);

  if (!order[0]) {
    return NextResponse.json({ error: "Order not found. Please check your order number and phone number." }, { status: 404 });
  }
  if (order[0].orderStatus !== "delivered") {
    return NextResponse.json({ error: "You can only review after your order has been delivered." }, { status: 403 });
  }

  // Prevent duplicate guest review for same order
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.orderId, order[0].id), eq(reviews.customerName, customerName.trim())))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "You have already submitted a review for this order." }, { status: 409 });
  }

  await db.insert(reviews).values({
    productId: null,
    orderId: order[0].id,
    accountId: null,
    customerName: customerName.trim(),
    rating,
    content: content?.trim() || "",
    approved: true,
  });

  return NextResponse.json({ success: true });
}

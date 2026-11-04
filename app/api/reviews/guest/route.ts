import { NextRequest, NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { orderItems, orders, reviews } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizeIndianPhone } from "@/lib/phone";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    orderNumber?: string;
    phone?: string;
    customerName?: string;
    rating?: number;
    content?: string;
  };
  const { orderNumber, phone, customerName, rating, content } = body;

  if (!orderNumber || !phone || !customerName || !rating) {
    return NextResponse.json(
      { error: "Order number, phone, name, and rating are required." },
      { status: 400 }
    );
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5 stars." }, { status: 400 });
  }
  if (!/^RS-[A-Za-z0-9-]+$/i.test(orderNumber.trim())) {
    return NextResponse.json({ error: "Invalid order number." }, { status: 400 });
  }

  const db = getDb();
  const cleanPhone = normalizeIndianPhone(phone);

  // Verify the order exists and belongs to this phone
  const order = await db
    .select({ id: orders.id, orderStatus: orders.orderStatus })
    .from(orders)
    .where(
      and(
        eq(orders.orderNumber, orderNumber.trim().toUpperCase()),
        or(
          eq(orders.phone, cleanPhone),
          eq(orders.phone, `+91${cleanPhone}`),
          eq(orders.phone, `+91 ${cleanPhone}`),
          eq(orders.phone, `0${cleanPhone}`)
        )
      )
    )
    .limit(1);

  if (!order[0]) {
    return NextResponse.json(
      { error: "Order not found. Please check your order number and phone number." },
      { status: 404 }
    );
  }
  if (order[0].orderStatus !== "delivered") {
    return NextResponse.json(
      { error: "You can submit a review once your order has been delivered." },
      { status: 403 }
    );
  }

  // Prevent duplicate review for this order
  const existing = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.orderId, order[0].id))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "A review has already been submitted for this order. Thank you!" },
      { status: 409 }
    );
  }

  // Find the first product in this order to associate the review with
  const items = await db
    .select({ productId: orderItems.productId })
    .from(orderItems)
    .where(eq(orderItems.orderId, order[0].id))
    .limit(1);

  const matchedProductId = items[0]?.productId ?? null;

  await db.insert(reviews).values({
    productId: matchedProductId,
    orderId: order[0].id,
    accountId: null,
    customerName: customerName.trim(),
    rating,
    content: content?.trim() || "",
    approved: true,
  });

  return NextResponse.json({ success: true });
}

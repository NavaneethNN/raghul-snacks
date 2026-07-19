import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { customers, orderItems, orders } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { verifiedOrderSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";

export async function POST(request: Request) {
  const payload = verifiedOrderSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: "Razorpay credentials are not configured." }, { status: 500 });
  const expected = createHmac("sha256", secret).update(`${payload.data.razorpayOrderId}|${payload.data.razorpayPaymentId}`).digest("hex");
  const valid = expected.length === payload.data.razorpaySignature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(payload.data.razorpaySignature));
  if (!valid) return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });

  try {
    const db = getDb();
    const existing = await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.razorpayOrderId, payload.data.razorpayOrderId)).limit(1);
    if (existing[0]) return NextResponse.json({ verified: true, orderNumber: existing[0].orderNumber });

    const { lines, total } = priceOrder(payload.data.items);
    const [customer] = await db.insert(customers).values({ name: payload.data.customerName, phone: payload.data.phone, email: payload.data.email || null }).onConflictDoUpdate({ target: customers.phone, set: { name: payload.data.customerName, email: payload.data.email || null } }).returning({ id: customers.id });
    const orderNumber = `RS-${Date.now().toString().slice(-8)}`;
    const [order] = await db.insert(orders).values({ orderNumber, customerId: customer.id, customerName: payload.data.customerName, phone: payload.data.phone, email: payload.data.email || null, address: payload.data.address, total: String(total), paymentStatus: "paid", orderStatus: "placed", razorpayOrderId: payload.data.razorpayOrderId }).returning({ id: orders.id });
    await db.insert(orderItems).values(lines.map((line) => ({ orderId: order.id, name: line.product.name, quantity: line.quantity, price: String(line.product.offerPrice) })));
    return NextResponse.json({ verified: true, orderNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment was verified but the order could not be saved.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

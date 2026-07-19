import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { customerAccounts, customers, orderItems, orders } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName, getCustomerSession, hashPassword } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";
import { cashfreeVerifiedOrderSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";
import { getCashfreeOrder } from "@/lib/cashfree";
import { createShiprocketShipment } from "@/lib/shiprocket";

export async function POST(request: Request) {
  const payload = cashfreeVerifiedOrderSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });

  try {
    const paymentOrder = await getCashfreeOrder(payload.data.cashfreeOrderId);
    if (paymentOrder.order_status !== "PAID") return NextResponse.json({ error: "Payment is not complete yet." }, { status: 400 });

    const db = getDb();
    const existing = await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.paymentOrderId, payload.data.cashfreeOrderId)).limit(1);
    if (existing[0]) return NextResponse.json({ verified: true, orderNumber: existing[0].orderNumber });

    const { lines, subtotal } = priceOrder(payload.data.items);
    const total = Number(paymentOrder.order_amount);
    const shipping = total - subtotal;
    const courierId = Number(paymentOrder.order_tags?.courier_id);
    if (!Number.isFinite(total) || shipping < 0) return NextResponse.json({ error: "Payment amount does not match this order." }, { status: 400 });

    const email = payload.data.email.toLowerCase();
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    let account: { id: number; name: string; email: string } | undefined;
    if (session) {
      account = (await db.select({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email }).from(customerAccounts).where(eq(customerAccounts.id, session.id)).limit(1))[0];
      if (!account || account.email !== email) return NextResponse.json({ error: "Your signed-in account does not match this checkout email." }, { status: 403 });
    } else {
      if (!payload.data.password) return NextResponse.json({ error: "Create a password to complete guest checkout." }, { status: 400 });
      const existingAccount = (await db.select({ id: customerAccounts.id }).from(customerAccounts).where(eq(customerAccounts.email, email)).limit(1))[0];
      if (existingAccount) return NextResponse.json({ error: "An account already exists for this email. Please log in and try again." }, { status: 409 });
      account = (await db.insert(customerAccounts).values({ name: payload.data.customerName, email, passwordHash: await hashPassword(payload.data.password) }).returning({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email }))[0];
    }
    if (!account) throw new Error("Unable to resolve the customer account.");
    const [customer] = await db.insert(customers).values({ name: payload.data.customerName, phone: payload.data.phone, email: payload.data.email }).onConflictDoUpdate({ target: customers.phone, set: { name: payload.data.customerName, email: payload.data.email } }).returning({ id: customers.id });
    const orderNumber = `RS-${Date.now().toString().slice(-8)}`;
    const [order] = await db.insert(orders).values({ orderNumber, customerId: customer.id, accountId: account.id, customerName: payload.data.customerName, phone: payload.data.phone, email: payload.data.email || null, address: payload.data.address, city: payload.data.city, state: payload.data.state, pincode: payload.data.pincode, total: String(total), paymentStatus: "paid", orderStatus: "placed", paymentOrderId: payload.data.cashfreeOrderId }).returning({ id: orders.id });
    await db.insert(orderItems).values(lines.map((line) => ({ orderId: order.id, name: line.product.name, quantity: line.quantity, price: String(line.product.offerPrice) })));
    try {
      const shipment = await createShiprocketShipment({ orderNumber, customerName: payload.data.customerName, phone: payload.data.phone, email: payload.data.email || null, address: payload.data.address, city: payload.data.city, state: payload.data.state, pincode: payload.data.pincode, subtotal, shipping, courierId: Number.isFinite(courierId) ? courierId : null, lines });
      if (shipment) await db.update(orders).set({ shiprocketOrderId: String(shipment.order_id), shipmentId: shipment.shipment_id ? String(shipment.shipment_id) : null, awbCode: shipment.awb_code ?? null, shippingStatus: "created" }).where(eq(orders.id, order.id));
    } catch {
      await db.update(orders).set({ shippingStatus: "failed" }).where(eq(orders.id, order.id));
    }
    const response = NextResponse.json({ verified: true, orderNumber });
    response.cookies.set(customerCookieName(), createCustomerSession(account), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment was verified but the order could not be saved.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

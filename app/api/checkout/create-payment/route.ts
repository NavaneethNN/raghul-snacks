import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerAccounts } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";
import { checkoutSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";
import { createCashfreeOrder } from "@/lib/cashfree";
import { getShiprocketQuote } from "@/lib/shiprocket";

export async function POST(request: Request) {
  const payload = checkoutSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Please check the delivery details and cart." }, { status: 400 });
  try {
    const db = getDb();
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);

    // User must be logged in to checkout
    if (!session) {
      return NextResponse.json({ error: "You must be logged in to continue checkout." }, { status: 401 });
    }

    const account = (await db.select({ id: customerAccounts.id, email: customerAccounts.email }).from(customerAccounts).where(eq(customerAccounts.id, session.id)).limit(1))[0];

    if (!account) {
      return NextResponse.json({ error: "Account not found. Please log in again." }, { status: 404 });
    }
    const { subtotal, weight } = await priceOrder(payload.data.items);
    const quote = await getShiprocketQuote(payload.data.pincode, weight, subtotal);
    if (!quote) return NextResponse.json({ error: "Shiprocket delivery configuration is incomplete." }, { status: 503 });
    const total = Math.round((subtotal + quote.charge) * 100) / 100;
    const orderId = `RS${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const origin = new URL(request.url).origin;
    const payment = await createCashfreeOrder({ orderId, amount: total, customerName: payload.data.customerName, customerPhone: payload.data.phone, customerEmail: payload.data.email, returnUrl: `${origin}/checkout?cashfree_order_id={order_id}`, shipping: quote.charge, courierId: quote.courierId });
    return NextResponse.json({ orderId: payment.orderId, paymentSessionId: payment.paymentSessionId, environment: payment.environment, shipping: quote.charge, courierName: quote.courierName, estimatedDeliveryDays: quote.estimatedDeliveryDays });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

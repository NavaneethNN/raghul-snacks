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
    const email = payload.data.email.toLowerCase();
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    const existingAccount = (await db.select({ id: customerAccounts.id, email: customerAccounts.email }).from(customerAccounts).where(eq(customerAccounts.email, email)).limit(1))[0];
    const isSignedInAccount = Boolean(session && existingAccount && session.id === existingAccount.id && session.email === existingAccount.email);
    if (existingAccount && !isSignedInAccount) return NextResponse.json({ error: "An account already exists for this email. Please log in to continue checkout." }, { status: 409 });
    if (!existingAccount && !payload.data.password) return NextResponse.json({ error: "Create a password to set up your account during checkout." }, { status: 400 });
    const { subtotal, weight } = priceOrder(payload.data.items);
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

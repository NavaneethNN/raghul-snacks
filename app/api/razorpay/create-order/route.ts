import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerAccounts } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";
import { checkoutSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";
import { validateCoupon } from "@/lib/coupons";
import { createRazorpayOrder, getRazorpayKeyId } from "@/lib/razorpay";

const isManual = process.env.DELIVERY_MODE === "manual";

export async function POST(request: Request) {
  const payload = checkoutSchema.safeParse(await request.json());
  if (!payload.success)
    return NextResponse.json({ error: "Please check the delivery details and cart." }, { status: 400 });
  try {
    const db = getDb();
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);

    let accountEmail: string | undefined;
    if (session) {
      const account = (
        await db
          .select({ id: customerAccounts.id, email: customerAccounts.email })
          .from(customerAccounts)
          .where(eq(customerAccounts.id, session.id))
          .limit(1)
      )[0];
      if (account) accountEmail = account.email;
    }

    const { lines, subtotal, weight } = await priceOrder(payload.data.items);

    let discount = 0;
    if (payload.data.couponCode) {
      const couponResult = await validateCoupon(
        payload.data.couponCode,
        subtotal,
        lines,
        accountEmail
      );
      if (!couponResult.ok)
        return NextResponse.json({ error: couponResult.error }, { status: 400 });
      discount = couponResult.discountAmount;
    }

    // Manual delivery mode: use client-calculated shipping (already verified from DB settings)
    let shippingCharge = payload.data.shipping ?? 0;
    let courierName = "Delivery";
    let estimatedDeliveryDays: string | null = "3–7 business days";

    if (!isManual) {
      // Shiprocket mode — import lazily to avoid bundling in manual builds
      const { getShiprocketQuote } = await import("@/lib/shiprocket");
      const quote = await getShiprocketQuote(payload.data.pincode, weight, subtotal - discount);
      if (!quote)
        return NextResponse.json(
          { error: "Shiprocket delivery configuration is incomplete." },
          { status: 503 }
        );
      shippingCharge = quote.charge;
      courierName = quote.courierName;
      estimatedDeliveryDays = quote.estimatedDeliveryDays;
    }

    const total = Math.round((subtotal - discount + shippingCharge) * 100) / 100;
    const orderId = `RS${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    const razorpayOrder = await createRazorpayOrder(total, orderId);

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: getRazorpayKeyId(),
      shipping: shippingCharge,
      courierName,
      estimatedDeliveryDays,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

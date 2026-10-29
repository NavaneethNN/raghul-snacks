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

    // Calculate shipping server-side from DB settings (same logic as client)
    let shippingCharge = 0;
    let courierName = "Delivery";
    const estimatedDeliveryDays: string | null = "3–7 business days";

    if (!isManual) {
      // Shiprocket mode
      const { getShiprocketQuote } = await import("@/lib/shiprocket");
      const quote = await getShiprocketQuote(payload.data.pincode, weight, subtotal - discount);
      if (!quote)
        return NextResponse.json({ error: "Shiprocket delivery configuration is incomplete." }, { status: 503 });
      shippingCharge = quote.charge;
      courierName = quote.courierName;
    } else {
      // Manual mode: calculate from DB settings
      const db = getDb();
      const { settings } = await import("@/drizzle/schema");
      const allSettings = await db.select().from(settings);
      const s: Record<string, string> = {};
      allSettings.forEach(row => { s[row.key] = row.value; });

      let tnRate = parseInt(s.shippingTamilNadu || "60");
      let southRate = parseInt(s.shippingSouthIndia || "100");
      let northRate = parseInt(s.shippingNorthIndia || "250");
      let extraRate = parseInt(s.shippingExtraKg || "30");

            const stateNorm = (payload.data.state || "").trim().toLowerCase();
      const isTN = stateNorm === "tamil nadu";
      const isSouth = ["kerala", "karnataka", "andhra pradesh", "telangana"].includes(stateNorm);

      let baseRate: number;
      if (isTN) {
        baseRate = tnRate;
        courierName = "Delivery";
      } else if (isSouth) {
        baseRate = southRate;
        courierName = "Delivery";
      } else {
        baseRate = northRate;
        courierName = "Air Delivery";
      }

      const totalWeightKg = Math.max(1, weight);
      const extraKg = Math.ceil(Math.max(0, totalWeightKg - 1));
      shippingCharge = baseRate + extraKg * extraRate;
    }

    const total = Math.round((subtotal - discount + shippingCharge) * 100) / 100;
    console.log(`[razorpay/create-order] subtotal=${subtotal} discount=${discount} shipping=${shippingCharge} total=${total}`);
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

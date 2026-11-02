import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { customerAccounts, customerAddresses, customers, orderItems, orders, products } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";
import { razorpayVerifiedOrderSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";
import { validateCoupon } from "@/lib/coupons";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { sendOrderConfirmationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const payload = razorpayVerifiedOrderSchema.safeParse(await request.json());
  if (!payload.success)
    return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });

  try {
    // Verify Razorpay signature before doing anything
    const signatureValid = verifyRazorpaySignature(
      payload.data.razorpayOrderId,
      payload.data.razorpayPaymentId,
      payload.data.razorpaySignature
    );
    if (!signatureValid)
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });

    const db = getDb();

    // Idempotency: if we already created this order, return the existing order number
    const existing = await db
      .select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(eq(orders.paymentOrderId, payload.data.razorpayOrderId))
      .limit(1);
    if (existing[0]) return NextResponse.json({ verified: true, orderNumber: existing[0].orderNumber });

    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    let accountId: number | null = null;
    let accountEmail: string | undefined;

    if (session) {
      const account = (
        await db
          .select({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email })
          .from(customerAccounts)
          .where(eq(customerAccounts.id, session.id))
          .limit(1)
      )[0];
      if (account) {
        accountId = account.id;
        accountEmail = account.email;
      }
    }

    const { lines, subtotal, packageBox } = await priceOrder(payload.data.items);

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

    // Determine payment method from paymentId prefix (pay_ prefix is standard Razorpay)
    const paymentMethod = payload.data.razorpayPaymentId.startsWith("pay_") ? "online" : "online";

    const [customer] = await db
      .insert(customers)
      .values({
        name: payload.data.customerName,
        phone: payload.data.phone,
        email: payload.data.email,
      })
      .onConflictDoUpdate({
        target: customers.phone,
        set: { name: payload.data.customerName, email: payload.data.email },
      })
      .returning({ id: customers.id });

    const orderNumber = `RS-${Date.now().toString().slice(-8)}`;

    // Fetch the Razorpay order to get the exact paid amount (in paise)
    const { getRazorpayKeyId } = await import("@/lib/razorpay");
    const keyId = getRazorpayKeyId();
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rpOrderRes = await fetch(
      `https://api.razorpay.com/v1/orders/${encodeURIComponent(payload.data.razorpayOrderId)}`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const rpOrder = (await rpOrderRes.json()) as { amount?: number; amount_paid?: number };
    const totalPaid = rpOrder.amount ? rpOrder.amount / 100 : subtotal - discount;
    const shipping = Math.max(0, Math.round((totalPaid - (subtotal - discount)) * 100) / 100);
    const shippingExtra = shipping > 0 ? 5 : 0;
    const shippingActual = Math.max(0, Math.round((shipping - shippingExtra) * 100) / 100);

    const [order] = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId: customer.id,
        accountId,
        customerName: payload.data.customerName,
        phone: payload.data.phone,
        email: payload.data.email || null,
        address: payload.data.address,
        city: payload.data.city,
        state: payload.data.state,
        pincode: payload.data.pincode,
        total: String(totalPaid),
        couponCode: payload.data.couponCode || null,
        discount: String(discount),
        paymentStatus: "paid",
        paymentMethod,
        orderStatus: "placed",
        paymentOrderId: payload.data.razorpayOrderId,
        shippingActual: String(shippingActual),
        shippingExtra: String(shippingExtra),
        billedWeight: String(packageBox.totalWeightKg),
        packageLength: String(packageBox.length),
        packageBreadth: String(packageBox.breadth),
        packageHeight: String(packageBox.height),
        packageBoxName: packageBox.boxName,
      })
      .returning({ id: orders.id });

    await db.insert(orderItems).values(
      lines.map((line) => {
        const baseId = typeof line.product.id === "number" ? line.product.id : null;
        // Parse variant ID from cart product ID format "6-v12" → variantId=12
        const variantId = line.product.variantId ?? null;
        const approxWeight = (line.product.approxWeight as string) ?? (line.product.weight as string) ?? null;
        return {
          orderId: order.id,
          productId: baseId,
          variantId: typeof variantId === "number" ? variantId : null,
          name: line.product.name,
          quantity: line.quantity,
          price: String(line.product.offerPrice),
          weight: (line.product.weight as string) ?? null,
          approxWeight,
        };
      })
    );

    // Auto-save address to customer account if logged in
    if (accountId) {
      try {
        const existingAddresses = await db
          .select({ id: customerAddresses.id })
          .from(customerAddresses)
          .where(
            and(
              eq(customerAddresses.accountId, accountId),
              eq(customerAddresses.address, payload.data.address),
              eq(customerAddresses.pincode, payload.data.pincode)
            )
          )
          .limit(1);

        if (existingAddresses.length === 0) {
          const countRes = await db
            .select({ id: customerAddresses.id })
            .from(customerAddresses)
            .where(eq(customerAddresses.accountId, accountId));

          await db.insert(customerAddresses).values({
            accountId,
            name: payload.data.customerName,
            phone: payload.data.phone,
            address: payload.data.address,
            city: payload.data.city,
            state: payload.data.state,
            pincode: payload.data.pincode,
            isDefault: countRes.length === 0, // First address becomes default
          });
        }
      } catch (addrErr) {
        console.error("[razorpay/verify] Failed to auto-save customer address:", addrErr);
      }
    }

    // Send order confirmation email to customer + admin packing alert (non-fatal)
    const targetCustomerEmail = (payload.data.email || accountEmail || "").trim();
    console.log(`[razorpay/verify] Sending confirmation email for ${orderNumber} to customer '${targetCustomerEmail}'`);
    try {
      await sendOrderConfirmationEmail({
        customerName: payload.data.customerName,
        customerEmail: targetCustomerEmail,
        phone: payload.data.phone,
        orderNumber,
        items: lines.map((line) => ({
          name: line.product.name,
          weight: line.product.weight as string | null,
          quantity: line.quantity,
          price: line.product.offerPrice,
        })),
        subtotal,
        shipping,
        discount,
        total: subtotal - discount + shipping,
        couponCode: payload.data.couponCode || null,
        address: payload.data.address,
        city: payload.data.city,
        state: payload.data.state,
        pincode: payload.data.pincode,
        paymentMethod,
      });
    } catch (emailErr) {
      console.error("[email] Failed to send order confirmation email:", emailErr);
    }

    const response = NextResponse.json({ verified: true, orderNumber });

    if (session && accountId) {
      const account = { id: accountId, name: payload.data.customerName, email: payload.data.email };
      response.cookies.set(customerCookieName(), createCustomerSession(account as any), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Payment was verified but the order could not be saved.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

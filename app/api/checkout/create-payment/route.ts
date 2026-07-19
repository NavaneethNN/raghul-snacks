import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";
import { getRazorpayClient } from "@/lib/razorpay";

export async function POST(request: Request) {
  const payload = checkoutSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "Please check the delivery details and cart." }, { status: 400 });
  try {
    const { total } = priceOrder(payload.data.items);
    const order = await getRazorpayClient().orders.create({ amount: total * 100, currency: "INR", receipt: `rs_${Date.now()}`, notes: { phone: payload.data.phone } });
    return NextResponse.json({ id: order.id, amount: order.amount, currency: order.currency, key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

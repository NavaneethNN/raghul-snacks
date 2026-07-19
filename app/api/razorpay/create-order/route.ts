import { NextResponse } from "next/server";
import { z } from "zod";
import { getRazorpayClient } from "@/lib/razorpay";

const payloadSchema = z.object({ amount: z.number().int().positive() });

export async function POST(request: Request) {
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
  try {
    const order = await getRazorpayClient().orders.create({ amount: payload.data.amount, currency: "INR", receipt: `rs_${Date.now()}` });
    return NextResponse.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create payment order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { orders } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const lookupSchema = z.object({
  orderNumber: z.string().trim().regex(/^RS-\d{8}$/i, "Enter a valid order number."),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
});

export async function POST(request: Request) {
  const input = lookupSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Enter your order number and the mobile number used at checkout." }, { status: 400 });
  try {
    const [order] = await getDb().select({ orderNumber: orders.orderNumber, orderStatus: orders.orderStatus, paymentStatus: orders.paymentStatus, createdAt: orders.createdAt }).from(orders).where(and(eq(orders.orderNumber, input.data.orderNumber.toUpperCase()), eq(orders.phone, input.data.phone))).limit(1);
    if (!order) return NextResponse.json({ error: "We could not find an order with those details." }, { status: 404 });
    return NextResponse.json({ order: { ...order, createdAt: order.createdAt.toISOString() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retrieve your order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

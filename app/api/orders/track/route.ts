import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { orders } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

const lookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^RS-\d{8}$/i, "Please enter a valid order number (format: RS-12345678)."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number."),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please enter your order number and mobile number." },
      { status: 400 }
    );
  }

  const input = lookupSchema.safeParse(body);
  if (!input.success) {
    const errorMsg =
      input.error.issues[0]?.message ||
      "Please enter your order number (e.g. RS-12345678) and the 10-digit mobile number used at checkout.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    const [order] = await getDb()
      .select({
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        city: orders.city,
        state: orders.state,
        pincode: orders.pincode,
        total: orders.total,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        shippingStatus: orders.shippingStatus,
        awbCode: orders.awbCode,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.orderNumber, input.data.orderNumber.toUpperCase()),
          eq(orders.phone, input.data.phone)
        )
      )
      .limit(1);

    if (!order) {
      return NextResponse.json(
        {
          error:
            "No order found matching these details. Please double-check your order number and mobile number.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        ...order,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    // Log technical error on the server for admin investigation
    console.error("[orders/track] Database query error:", error);

    // Always return a clean, friendly message to the customer - NEVER leak raw SQL to the user
    return NextResponse.json(
      {
        error:
          "No order found matching these details. Please verify your order number and phone number, or reach out to us on WhatsApp.",
      },
      { status: 404 }
    );
  }
}

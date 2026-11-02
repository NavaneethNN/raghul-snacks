import { and, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { orders } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getShiprocketTracking, getCourierTrackingUrl } from "@/lib/shiprocket";

const lookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^RS-[A-Za-z0-9-]+$/i, "Please enter a valid order number (format: RS-12345678 or RS-WA-...)."),
  phone: z
    .string()
    .trim()
    .transform((val) => val.replace(/^\+91/, "").replace(/\D/g, ""))
    .refine((val) => /^[6-9]\d{9}$/.test(val), "Please enter a valid 10-digit mobile number."),
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
      "Please enter your order number (e.g. RS-12345678) and your 10-digit mobile number.";
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
        shipmentId: orders.shipmentId,
        awbCode: orders.awbCode,
        packageBoxName: orders.packageBoxName,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.orderNumber, input.data.orderNumber.toUpperCase()),
          or(
            eq(orders.phone, input.data.phone),
            eq(orders.phone, `+91${input.data.phone}`)
          )
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

    let tracking = null;
    if (order.awbCode) {
      try {
        tracking = await getShiprocketTracking(order.awbCode);
      } catch (err) {
        console.warn("[orders/track] Live tracking lookup error:", err);
      }
    }

    const courierName =
      order.shipmentId && !/^\d+$/.test(order.shipmentId)
        ? order.shipmentId
        : tracking?.courierName || (order.awbCode ? "Shiprocket Express" : null);

    return NextResponse.json({
      order: {
        ...order,
        courierName,
        tracking,
        trackingUrl: order.awbCode ? getCourierTrackingUrl(order.shipmentId, order.awbCode) : null,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[orders/track] Database query error:", error);
    return NextResponse.json(
      {
        error:
          "No order found matching these details. Please verify your order number and phone number, or reach out to us on WhatsApp.",
      },
      { status: 404 }
    );
  }
}

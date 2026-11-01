import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { orderItems, orders, products } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { parseWeightToKg, calculatePackagingBufferKg } from "@/lib/catalog";
import {
  createShiprocketShipment,
  generateShiprocketLabel,
  isShiprocketConfigured,
} from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

const shipmentRequestSchema = z.object({
  weight: z.number().positive("Weight must be greater than 0"),
  length: z.number().positive().optional().default(15),
  breadth: z.number().positive().optional().default(15),
  height: z.number().positive().optional().default(10),
  courierName: z.string().trim().optional(),
  awbCode: z.string().trim().optional(),
  provider: z.enum(["shiprocket", "manual"]).optional(),
});

// GET /api/admin/orders/[id]/shipment
// Returns shipment status, pre-filled estimated weight, and label link if available
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const db = getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Calculate base weight from products + dynamic parcel packaging buffer
    const productWeight = items.reduce((sum, item) => {
      const w = item.weight ? parseWeightToKg(item.weight) : 0.25;
      return sum + w * item.quantity;
    }, 0);
    const packagingBufferKg = calculatePackagingBufferKg(productWeight);
    const estimatedWeightKg = Math.round((productWeight + packagingBufferKg) * 100) / 100;

    let labelUrl: string | null = null;
    if (order.shipmentId && isShiprocketConfigured()) {
      try {
        labelUrl = await generateShiprocketLabel(order.shipmentId);
      } catch {
        // Label generation can fail if not ready yet
      }
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      shippingStatus: order.shippingStatus,
      shipmentId: order.shipmentId,
      awbCode: order.awbCode,
      estimatedWeightKg,
      shiprocketConfigured: isShiprocketConfigured(),
      labelUrl,
      trackingUrl: order.awbCode ? `https://shiprocket.co/tracking/${order.awbCode}` : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load shipment details" },
      { status: 500 }
    );
  }
}

// POST /api/admin/orders/[id]/shipment
// Books courier through Shiprocket or records manual dispatch tracking
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = shipmentRequestSchema.safeParse(await request.json());
    if (!body.success) {
      const msg = body.error.issues[0]?.message || "Invalid shipment parameters";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const db = getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const finalWeight = body.data.weight;
    const shiprocketActive = isShiprocketConfigured() && body.data.provider !== "manual";

    let shipmentId: string | null = null;
    let shiprocketOrderId: string | null = null;
    let awbCode: string | null = null;

    if (shiprocketActive) {
      // Book through Shiprocket External API
      const lines = items.map((it) => ({
        product: { name: it.name, slug: `sku-${it.id}` },
        quantity: it.quantity,
        lineTotal: parseFloat(it.price) * it.quantity,
      }));

      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      const shippingPaid = order.shippingActual ? parseFloat(order.shippingActual) : 0;

      const srResult = await createShiprocketShipment({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        phone: order.phone,
        email: order.email,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        subtotal,
        shipping: shippingPaid,
        weight: finalWeight,
        length: body.data.length,
        breadth: body.data.breadth,
        height: body.data.height,
        lines,
      });

      if (!srResult) {
        throw new Error("Shiprocket shipment returned empty response.");
      }

      shiprocketOrderId = srResult.order_id ? String(srResult.order_id) : null;
      shipmentId = srResult.shipment_id ? String(srResult.shipment_id) : null;
      awbCode = srResult.awb_code ?? null;
    } else {
      // Manual / Local courier dispatch
      const courier = body.data.courierName || "Local Courier";
      const manualAwb = body.data.awbCode || `TRK-${order.orderNumber.replace(/[^0-9]/g, "")}`;

      shipmentId = courier;
      awbCode = manualAwb;
    }

    // Update order with courier booking and advance status to dispatched
    await db
      .update(orders)
      .set({
        shiprocketOrderId: shiprocketOrderId ?? order.shiprocketOrderId,
        shipmentId: shipmentId ?? order.shipmentId,
        awbCode: awbCode ?? order.awbCode,
        shippingStatus: "created",
        orderStatus: "dispatched",
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      success: true,
      shipmentId,
      awbCode,
      orderStatus: "dispatched",
      shippingStatus: "created",
    });
  } catch (error) {
    console.error("[shipment] Booking failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Courier booking failed." },
      { status: 500 }
    );
  }
}

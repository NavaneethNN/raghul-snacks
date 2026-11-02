import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { orderItems, orders } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { parseWeightToKg, calculatePackagingBufferKg } from "@/lib/catalog";
import {
  createShiprocketShipment,
  generateShiprocketLabel,
  isShiprocketConfigured,
  getShiprocketWalletBalance,
} from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

const shipmentRequestSchema = z.object({
  weight: z.number().positive("Weight must be greater than 0"),
  length: z.number().positive().optional().default(15),
  breadth: z.number().positive().optional().default(15),
  height: z.number().positive().optional().default(10),
  boxName: z.string().trim().optional(),
  courierId: z.number().optional(),
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

    const billedWeight = order.billedWeight ? parseFloat(order.billedWeight) : null;
    const length = order.packageLength ? parseFloat(order.packageLength) : 15;
    const breadth = order.packageBreadth ? parseFloat(order.packageBreadth) : 15;
    const height = order.packageHeight ? parseFloat(order.packageHeight) : 10;
    const boxName = order.packageBoxName || null;

    // Calculate base weight from items (using approxWeight when available) + parcel packaging buffer as fallback
    const productWeight = items.reduce((sum, item) => {
      const w = item.approxWeight
        ? parseWeightToKg(item.approxWeight)
        : item.weight
        ? parseWeightToKg(item.weight)
        : 0.25;
      return sum + w * item.quantity;
    }, 0);
    const packagingBufferKg = calculatePackagingBufferKg(productWeight);
    const estimatedWeightKg = billedWeight ?? Math.round((productWeight + packagingBufferKg) * 100) / 100;

    let labelUrl: string | null = null;
    if (order.shipmentId && isShiprocketConfigured()) {
      try {
        labelUrl = await generateShiprocketLabel(order.shipmentId);
      } catch {
        // Label generation can fail if not ready yet
      }
    }
    if (!labelUrl && order.awbCode) {
      labelUrl = `/api/admin/orders/${order.id}/label`;
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      shippingStatus: order.shippingStatus,
      shipmentId: order.shipmentId,
      awbCode: order.awbCode,
      estimatedWeightKg,
      length,
      breadth,
      height,
      boxName,
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
      // Validate wallet balance before initiating shipment to prevent 0-balance booking failures
      const wallet = await getShiprocketWalletBalance();
      if (wallet.configured && wallet.balance <= 0) {
        throw new Error(
          `Insufficient Shiprocket wallet balance (₹${wallet.balance.toFixed(2)}). Please recharge your wallet at app.shiprocket.in before booking, or choose Manual Booking.`
        );
      }

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
        courierId: body.data.courierId,
        courierName: body.data.courierName,
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

    const hasAwb = Boolean(awbCode && awbCode.trim() !== "");

    // Update order with courier booking; advance to 'dispatched' only if AWB is confirmed
    await db
      .update(orders)
      .set({
        shiprocketOrderId: shiprocketOrderId ?? order.shiprocketOrderId,
        shipmentId: shipmentId ?? order.shipmentId,
        awbCode: hasAwb ? awbCode : null,
        shippingStatus: hasAwb ? "created" : "pending",
        orderStatus: hasAwb ? "dispatched" : "packed",
        billedWeight: String(finalWeight),
        packageLength: String(body.data.length),
        packageBreadth: String(body.data.breadth),
        packageHeight: String(body.data.height),
        packageBoxName: body.data.boxName ?? order.packageBoxName,
      })
      .where(eq(orders.id, order.id));

    if (!hasAwb && shiprocketActive) {
      throw new Error(
        "Shiprocket order was created, but AWB could not be generated due to insufficient wallet balance (₹0.00). Please recharge your Shiprocket wallet or switch to Manual Booking."
      );
    }

    return NextResponse.json({
      success: true,
      shipmentId,
      awbCode,
      orderStatus: hasAwb ? "dispatched" : "packed",
      shippingStatus: hasAwb ? "created" : "pending",
      labelUrl: `/api/admin/orders/${order.id}/label`,
    });
  } catch (error) {
    console.error("[shipment] Booking failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Courier booking failed." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/orders/[id]/shipment
// Cancels courier booking, voids AWB in Shiprocket (triggering wallet refund), and resets order back to 'packed'
export async function DELETE(
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

    if (!order.awbCode && !order.shipmentId) {
      return NextResponse.json(
        { error: "No active courier booking or AWB found on this order." },
        { status: 400 }
      );
    }

    let cancelMessage = "Courier booking cancelled.";

    // If Shiprocket was used and AWB is present, cancel it on Shiprocket so charges are refunded to wallet
    if (order.awbCode && isShiprocketConfigured()) {
      const { cancelShiprocketAwb, cancelShiprocketOrder } = await import("@/lib/shiprocket");
      const awbRes = await cancelShiprocketAwb(order.awbCode);
      if (order.shiprocketOrderId) {
        await cancelShiprocketOrder(order.shiprocketOrderId).catch(() => {});
      }
      cancelMessage = awbRes.success
        ? "Shiprocket AWB cancelled. Wallet balance will be refunded automatically."
        : `Shiprocket notice: ${awbRes.message || "AWB cancelled locally."}`;
    }

    // Reset order back to 'packed' so it can be re-booked with new weight/courier
    await db
      .update(orders)
      .set({
        awbCode: null,
        shipmentId: null,
        shippingStatus: "pending",
        orderStatus: "packed",
      })
      .where(eq(orders.id, order.id));

    return NextResponse.json({
      success: true,
      message: cancelMessage,
      orderStatus: "packed",
    });
  } catch (error) {
    console.error("[shipment] Cancellation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel courier booking." },
      { status: 500 }
    );
  }
}

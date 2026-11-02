import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { orders, orderItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { buildInvoiceHtml } from "@/lib/invoice-html";
import { generateInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> },
) {
  try {
    const resolvedParams = await context.params;
    const rawOrderNumber = resolvedParams?.orderNumber;
    const orderNumber = (
      rawOrderNumber ||
      new URL(request.url).pathname.split("/").at(-2)
    )?.toUpperCase();

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }

    const db = getDb();

    const [order] = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        phone: orders.phone,
        email: orders.email,
        address: orders.address,
        city: orders.city,
        state: orders.state,
        pincode: orders.pincode,
        total: orders.total,
        shippingActual: orders.shippingActual,
        shippingExtra: orders.shippingExtra,
        paymentMethod: orders.paymentMethod,
        couponCode: orders.couponCode,
        discount: orders.discount,
        paymentStatus: orders.paymentStatus,
        orderStatus: orders.orderStatus,
        createdAt: orders.createdAt,
        packageBoxName: orders.packageBoxName,
        billedWeight: orders.billedWeight,
        packageLength: orders.packageLength,
        packageBreadth: orders.packageBreadth,
        packageHeight: orders.packageHeight,
        shipmentId: orders.shipmentId,
        awbCode: orders.awbCode,
      })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const items = await db
      .select({
        name: orderItems.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
        weight: orderItems.weight,
        approxWeight: orderItems.approxWeight,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const courierName =
      order.shipmentId && !/^\d+$/.test(order.shipmentId)
        ? order.shipmentId
        : order.awbCode
        ? "Shiprocket Express"
        : null;

    const url = new URL(request.url);
    const viewHtml = url.searchParams.get("view") === "html";

    // If explicit HTML view requested (e.g. for previewing in iframe), return clean HTML without auto-print
    if (viewHtml) {
      const html = buildInvoiceHtml({
        ...order,
        courierName,
        items,
        logoDataUri: "",
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // Default: Generate and automatically download clean vector Tax Invoice PDF
    const pdfBuffer = generateInvoicePdf({
      ...order,
      courierName,
      items,
    });

    return new Response(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${orderNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    const message = error instanceof Error ? error.message : "Unable to generate invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

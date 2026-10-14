import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { orders, orderItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { buildInvoiceHtml } from "@/lib/invoice-html";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> | { orderNumber: string } },
) {
  try {
    const resolvedParams =
      context.params instanceof Promise ? await context.params : context.params;
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
        couponCode: orders.couponCode,
        discount: orders.discount,
        paymentStatus: orders.paymentStatus,
        orderStatus: orders.orderStatus,
        createdAt: orders.createdAt,
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
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const html = buildInvoiceHtml({ ...order, items, logoDataUri: "" });

    // Inject auto-print script so the browser opens print dialog immediately
    const printableHtml = html.replace(
      "</body>",
      `<script>window.onload = function() { window.print(); }</script></body>`
    );

    return new NextResponse(printableHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    const message = error instanceof Error ? error.message : "Unable to generate invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

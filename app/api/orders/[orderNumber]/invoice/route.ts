import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { orders, orderItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import jsPDF from "jspdf";

export async function GET(request: NextRequest, context: { params: Promise<{ orderNumber: string }> | { orderNumber: string } }) {
  try {
    // Extract order number from URL path as fallback
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const orderNumberFromPath = pathParts[pathParts.length - 1];
    
    // Try to get from params, fallback to path extraction
    let orderNumber: string | undefined;
    try {
      const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
      orderNumber = resolvedParams?.orderNumber;
    } catch (e) {
      console.log("Error resolving params:", e);
    }
    
    // Fallback to path extraction if params failed
    if (!orderNumber && orderNumberFromPath) {
      orderNumber = orderNumberFromPath;
    }
    
    console.log("Invoice request for order number:", orderNumber);
    console.log("URL path:", url.pathname);
    
    if (!orderNumber) {
      console.log("No order number provided");
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }
    
    // Get order details
    const db = getDb();
    const orderData = await db
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
        paymentStatus: orders.paymentStatus,
        orderStatus: orders.orderStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber.toUpperCase()))
      .limit(1);

    if (!orderData[0]) {
      console.log("Order not found in database for:", orderNumber);
      // Try to find any orders to debug
      const allOrders = await db.select({ orderNumber: orders.orderNumber }).from(orders).limit(5);
      console.log("Sample order numbers in database:", allOrders.map(o => o.orderNumber));
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderData[0];
    const orderId = order.id;

    // Get order items
    const itemsData = await db
      .select({
        name: orderItems.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    // Calculate totals
    const subtotal = itemsData.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const shipping = 40;
    const discount = 0;
    const total = Number(order.total);

    // Generate PDF using jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Raghul Delights", margin, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("INVOICE", pageWidth - margin, y, { align: "right" });
    y += 15;

    // Order details
    doc.setFontSize(10);
    doc.text(`Invoice No: ${order.orderNumber}`, margin, y);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, pageWidth - margin, y, { align: "right" });
    y += 8;
    doc.text(`Status: ${order.orderStatus}`, margin, y);
    doc.text(`Payment: ${order.paymentStatus}`, pageWidth - margin, y, { align: "right" });
    y += 15;

    // Bill To
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", margin, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(order.customerName, margin, y);
    y += 6;
    doc.text(order.address, margin, y);
    y += 6;
    doc.text(`${order.city}, ${order.state} - ${order.pincode}`, margin, y);
    y += 6;
    doc.text(order.phone, margin, y);
    y += 15;

    // Items table
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Item", margin, y);
    doc.text("Qty", margin + 100, y);
    doc.text("Price", margin + 120, y, { align: "right" });
    doc.text("Total", pageWidth - margin - 5, y, { align: "right" });
    y += 8;

    doc.setFont("helvetica", "normal");
    itemsData.forEach((item) => {
      const itemTotal = Number(item.price) * item.quantity;
      doc.text(item.name, margin, y);
      doc.text(item.quantity.toString(), margin + 100, y);
      doc.text(`₹${Number(item.price).toFixed(2)}`, margin + 120, y, { align: "right" });
      doc.text(`₹${itemTotal.toFixed(2)}`, pageWidth - margin - 5, y, { align: "right" });
      y += 6;
    });

    y += 10;

    // Summary
    doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text(`Shipping: ₹${shipping.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.text(`Discount: ₹${discount.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Total: ₹${total.toFixed(2)}`, pageWidth - margin, y, { align: "right" });
    y += 15;

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Thank you for shopping with Raghul Delights!", pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.text("hello@raghulsnacks.com • +91 86678 29041", pageWidth / 2, y, { align: "center" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

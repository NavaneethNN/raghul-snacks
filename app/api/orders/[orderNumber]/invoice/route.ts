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

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = margin;

    // Header with green background
    doc.setFillColor(36, 49, 39);
    doc.rect(0, 0, pageWidth, 50, "F");
    
    // Company name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Raghul Snacks", margin, 25);
    
    // Tagline
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Traditional Millet Snacks", margin, 32);
    
    // Invoice label in header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth - margin, 30, { align: "right" });
    
    y = 60;

    // Invoice details row
    doc.setTextColor(36, 49, 39);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Number: ${order.orderNumber}`, margin, y);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}`, pageWidth - margin, y, { align: "right" });
    y += 8;
    doc.text(`Order Status: ${order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}`, margin, y);
    doc.text(`Payment: ${order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}`, pageWidth - margin, y, { align: "right" });
    y += 20;

    // Bill To section
    doc.setFillColor(247, 244, 236);
    doc.rect(margin, y, pageWidth - margin * 2, 35, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(36, 49, 39);
    doc.text("Bill To", margin + 5, y + 10);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(order.customerName, margin + 5, y + 18);
    doc.text(order.address, margin + 5, y + 24);
    doc.text(`${order.city}, ${order.state} - ${order.pincode}`, margin + 5, y + 30);
    doc.text(`Phone: ${order.phone}`, margin + 5, y + 36);
    
    y += 45;

    // Table header
    doc.setFillColor(201, 95, 59);
    doc.rect(margin, y, pageWidth - margin * 2, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Item", margin + 5, y + 8);
    doc.text("Quantity", pageWidth - margin - 75, y + 8);
    doc.text("Price", pageWidth - margin - 50, y + 8);
    doc.text("Total", pageWidth - margin - 5, y + 8, { align: "right" });
    y += 12;

    // Table rows
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    
    itemsData.forEach((item, index) => {
      if (y > 230) {
        doc.addPage();
        y = margin;
      }
      
      const itemTotal = Number(item.price) * item.quantity;
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 248, 242);
        doc.rect(margin, y, pageWidth - margin * 2, 10, "F");
      }
      
      doc.setFontSize(9);
      doc.text(item.name, margin + 5, y + 7);
      doc.text(item.quantity.toString(), pageWidth - margin - 75, y + 7);
      doc.text(`₹${Number(item.price).toFixed(2)}`, pageWidth - margin - 50, y + 7);
      doc.text(`₹${itemTotal.toFixed(2)}`, pageWidth - margin - 5, y + 7, { align: "right" });
      y += 10;
    });

    y += 15;

    // Total section with background
    doc.setFillColor(36, 49, 39);
    doc.rect(pageWidth - margin - 100, y, 100, 30, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Total Amount:", pageWidth - margin - 95, y + 12);
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`₹${Number(order.total).toFixed(2)}`, pageWidth - margin - 5, y + 18, { align: "right" });
    
    y += 40;

    // Footer section
    doc.setFillColor(247, 244, 236);
    doc.rect(0, 265, pageWidth, 35, "F");
    
    doc.setTextColor(36, 49, 39);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your order!", pageWidth / 2, 280, { align: "center" });
    doc.text("For queries, contact us at hello@raghulsnacks.com | +91 98765 43210", pageWidth / 2, 290, { align: "center" });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
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

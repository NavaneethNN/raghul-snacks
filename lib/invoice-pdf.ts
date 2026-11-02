import { jsPDF } from "jspdf";

export type InvoicePdfItem = {
  name: string;
  quantity: number;
  price: string | number;
  weight?: string | null;
  approxWeight?: string | null;
};

export type InvoicePdfData = {
  orderNumber: string;
  createdAt: Date;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  customerName: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  couponCode?: string | null;
  discount?: string | number | null;
  total: string | number;
  shippingActual?: string | number | null;
  shippingExtra?: string | number | null;
  courierName?: string | null;
  awbCode?: string | null;
  items: InvoicePdfItem[];
};

function formatInr(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const statusMap: Record<string, string> = {
  placed: "Placed",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const paymentMap: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  refunded: "Refunded",
};

/**
 * Generates a clean, professional, high-resolution vector Tax Invoice PDF.
 * Uses standard Latin-1 PDF typography with robust line-wrapping and multi-page handling.
 */
export function generateInvoicePdf(data: InvoicePdfData): Uint8Array {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = margin;

  // ── 1. Top Brand Banner ──
  doc.setFillColor(248, 245, 240); // Warm soft cream
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");

  // Brand Name & Tagline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(201, 95, 59); // Terracotta #c95f3b
  doc.text("RAGHUL DELIGHTS", margin + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text("Authentic Handmade Traditional Sweets & Savouries", margin + 6, y + 15);
  doc.text("Coimbatore, Tamil Nadu | WhatsApp: +91 98765 43210", margin + 6, y + 20);

  // Invoice Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("TAX INVOICE", pageWidth - margin - 6, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text("Original for Recipient", pageWidth - margin - 6, y + 16, { align: "right" });

  y += 28;

  // ── 2. Meta Grid (Bill To & Order Details) ──
  const boxWidth = (contentWidth - 6) / 2; // 88mm
  const boxHeight = 44;

  // Left Box: Customer Bill To
  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(228, 230, 235);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("BILLED TO / CUSTOMER", margin + 5, y + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  const custName = data.customerName || "Customer";
  doc.text(custName.length > 32 ? custName.slice(0, 32) + "..." : custName, margin + 5, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(data.phone ? `Phone: ${data.phone}` : "", margin + 5, y + 20);

  // Address lines (wrapped)
  const addrText = `${data.address || ""}`;
  const splitAddr = doc.splitTextToSize(addrText, boxWidth - 10);
  const addr1 = splitAddr[0] || "";
  const addr2 = splitAddr[1] || "";
  doc.text(addr1, margin + 5, y + 26);
  if (addr2) {
    doc.text(addr2, margin + 5, y + 31);
    doc.text(`${data.city || ""}, ${data.state || ""} · ${data.pincode || ""}`, margin + 5, y + 36);
  } else {
    doc.text(`${data.city || ""}, ${data.state || ""} · ${data.pincode || ""}`, margin + 5, y + 32);
    if (data.email) {
      doc.text(data.email, margin + 5, y + 38);
    }
  }

  // Right Box: Order Details
  const rightX = margin + boxWidth + 6;
  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(228, 230, 235);
  doc.roundedRect(rightX, y, boxWidth, boxHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("ORDER & DISPATCH DETAILS", rightX + 5, y + 7);

  const drawMetaRow = (label: string, val: string, rowY: number, isBold = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text(label, rightX + 5, rowY);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(val, rightX + boxWidth - 5, rowY, { align: "right" });
  };

  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  drawMetaRow("Order Number:", data.orderNumber, y + 14, true);
  drawMetaRow("Order Date:", formattedDate, y + 20);
  drawMetaRow("Order Status:", statusMap[data.orderStatus] || data.orderStatus, y + 26);

  const payMethod = data.paymentMethod ? ` (${data.paymentMethod.toUpperCase()})` : "";
  drawMetaRow("Payment:", `${paymentMap[data.paymentStatus] || data.paymentStatus}${payMethod}`, y + 32);

  const courierText = data.awbCode
    ? `${data.courierName || "Courier"} · ${data.awbCode}`
    : data.courierName
    ? data.courierName
    : "Awaiting dispatch";
  drawMetaRow("Shipment / AWB:", courierText.length > 25 ? courierText.slice(0, 25) + "..." : courierText, y + 38);

  y += boxHeight + 8;

  // ── 3. Items Table Header ──
  const colX = {
    idx: margin + 3,
    item: margin + 12,
    variant: margin + 96,
    qty: margin + 128,
    rate: margin + 152,
    amount: pageWidth - margin - 4,
  };

  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setDrawColor(220, 222, 226);
  doc.line(margin, y + 8, margin + contentWidth, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(70, 75, 85);
  doc.text("#", colX.idx, y + 5.5);
  doc.text("ITEM DESCRIPTION", colX.item, y + 5.5);
  doc.text("VARIANT", colX.variant, y + 5.5);
  doc.text("QTY", colX.qty, y + 5.5, { align: "center" });
  doc.text("PRICE", colX.rate, y + 5.5, { align: "right" });
  doc.text("AMOUNT", colX.amount, y + 5.5, { align: "right" });

  y += 8;

  // ── Items Table Rows ──
  let subtotal = 0;

  data.items.forEach((item, idx) => {
    // Check for page overflow
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    const price = Number(item.price) || 0;
    const lineTotal = price * item.quantity;
    subtotal += lineTotal;

    const rowBg = idx % 2 === 0 ? 255 : 250;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 9, "F");
    doc.setDrawColor(240, 240, 245);
    doc.line(margin, y + 9, margin + contentWidth, y + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(String(idx + 1), colX.idx, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    const itemName = item.name.length > 42 ? item.name.slice(0, 40) + "..." : item.name;
    doc.text(itemName, colX.item, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    const rawVariant = item.weight || item.approxWeight || "-";
    const variant = rawVariant !== "-" && rawVariant !== "—" ? rawVariant : "-";
    doc.text(variant, colX.variant, y + 6);

    doc.setTextColor(30, 30, 30);
    doc.text(String(item.quantity), colX.qty, y + 6, { align: "center" });

    doc.text(formatInr(price), colX.rate, y + 6, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(formatInr(lineTotal), colX.amount, y + 6, { align: "right" });

    y += 9;
  });

  y += 6;

  // ── 4. Financial Totals (Right Aligned Card) ──
  if (y > pageHeight - 55) {
    doc.addPage();
    y = margin;
  }

  const discount = Number(data.discount) || 0;
  const total = Number(data.total) || 0;
  const actualCourier = Number(data.shippingActual) || 0;
  const platformFee = Number(data.shippingExtra) || 0;
  const shipping = actualCourier > 0
    ? actualCourier
    : Math.max(0, Math.round((total - subtotal + discount - platformFee) * 100) / 100);

  const sumWidth = 84;
  const sumHeight = 36 + (discount > 0 ? 6 : 0) + (platformFee > 0 ? 6 : 0);
  const sumX = pageWidth - margin - sumWidth;

  doc.setFillColor(252, 252, 253);
  doc.setDrawColor(228, 230, 235);
  doc.roundedRect(sumX, y, sumWidth, sumHeight, 1.5, 1.5, "FD");

  let curY = y + 7;
  const drawSumRow = (label: string, val: string, isBold = false, isDiscount = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(isDiscount ? 22 : isBold ? 30 : 100, isDiscount ? 101 : isBold ? 30 : 100, isDiscount ? 52 : isBold ? 30 : 100);
    doc.text(label, sumX + 5, curY);
    doc.text(val, sumX + sumWidth - 5, curY, { align: "right" });
    curY += 6;
  };

  drawSumRow("Snacks Subtotal:", formatInr(subtotal));

  if (shipping > 0) {
    drawSumRow("Delivery / Courier:", formatInr(shipping));
  }

  if (platformFee > 0) {
    drawSumRow("Platform Fee:", formatInr(platformFee));
  }

  if (discount > 0) {
    drawSumRow(`Coupon Discount${data.couponCode ? ` (${data.couponCode})` : ""}:`, `- ${formatInr(discount)}`, false, true);
  }

  // Grand Total Highlight Strip
  doc.setFillColor(248, 245, 240);
  doc.rect(sumX + 0.5, curY - 2, sumWidth - 1, 11, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(201, 95, 59);
  doc.text("Total Paid / Collected:", sumX + 5, curY + 5.5);
  doc.text(formatInr(total), sumX + sumWidth - 5, curY + 5.5, { align: "right" });

  // ── 5. Bottom Footer ──
  const footerY = pageHeight - margin - 12;
  doc.setDrawColor(228, 230, 235);
  doc.line(margin, footerY, margin + contentWidth, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("This is an official computer-generated tax invoice. No physical signature is required.", pageWidth / 2, footerY + 5, { align: "center" });
  doc.text("Thank you for choosing Raghul Delights for your authentic snack cravings!", pageWidth / 2, footerY + 9, { align: "center" });

  return new Uint8Array(doc.output("arraybuffer"));
}

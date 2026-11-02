import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { orders, orderItems, products, productVariants } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { generateShiprocketLabel, isShiprocketConfigured } from "@/lib/shiprocket";
import { parseWeightToKg } from "@/lib/catalog";
import { selectOptimalPackagingBox } from "@/lib/packaging";

export const dynamic = "force-dynamic";

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

    // 1. If Shiprocket shipment ID is present, try to fetch official label URL
    if (order.shipmentId && isShiprocketConfigured() && /^\d+$/.test(order.shipmentId)) {
      try {
        const labelUrl = await generateShiprocketLabel(order.shipmentId);
        if (labelUrl) {
          return NextResponse.redirect(labelUrl);
        }
      } catch (err) {
        console.warn("[label] Shiprocket label fetch error, falling back to printable sheet:", err);
      }
    }

    // 2. Standard thermal shipping label (100mm x 150mm / 4x6 inch)
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const totalPacks = items.reduce((sum, it) => sum + (it.quantity || 1), 0);

    // Calculate total net snack weight from all order items with fallbacks for older records
    const missingVariantIds = items
      .filter((i) => (!i.weight || i.weight.trim() === "") && (!i.approxWeight || i.approxWeight.trim() === "") && i.variantId)
      .map((i) => i.variantId as number);
    const missingProductIds = items
      .filter((i) => (!i.weight || i.weight.trim() === "") && (!i.approxWeight || i.approxWeight.trim() === "") && !i.variantId && i.productId)
      .map((i) => i.productId as number);

    const variantWeightMap = new Map<number, string>();
    if (missingVariantIds.length > 0) {
      const vRows = await db
        .select({ id: productVariants.id, weight: productVariants.weight })
        .from(productVariants)
        .where(inArray(productVariants.id, missingVariantIds));
      for (const v of vRows) {
        if (v.weight) variantWeightMap.set(v.id, v.weight);
      }
    }

    const productWeightMap = new Map<number, string>();
    if (missingProductIds.length > 0) {
      const pRows = await db
        .select({ id: products.id, weight: products.weight })
        .from(products)
        .where(inArray(products.id, missingProductIds));
      for (const p of pRows) {
        if (p.weight) productWeightMap.set(p.id, p.weight);
      }
    }

    let netSnackWeightKg = 0;
    for (const item of items) {
      let raw = item.approxWeight || item.weight;
      if (!raw || raw.trim() === "") {
        if (item.variantId && variantWeightMap.has(item.variantId)) {
          raw = variantWeightMap.get(item.variantId) || null;
        } else if (item.productId && productWeightMap.has(item.productId)) {
          raw = productWeightMap.get(item.productId) || null;
        } else {
          // Attempt to extract weight directly from item name (e.g. "Kai Murukku - 500g")
          raw = item.name;
        }
      }
      const unitKg = raw ? parseWeightToKg(raw) : 0.25;
      netSnackWeightKg += unitKg * (item.quantity || 1);
    }
    netSnackWeightKg = Math.round(netSnackWeightKg * 1000) / 1000;

    // Determine optimal packaging box based on snack volume
    const optimalBox = await selectOptimalPackagingBox(netSnackWeightKg);

    // Guaranteed minimum weight: The final weight must never be lower than the net snack weight!
    const storedWeightKg = order.billedWeight ? parseFloat(order.billedWeight) : null;
    const finalWeightKg = Math.max(
      netSnackWeightKg,
      storedWeightKg && storedWeightKg >= netSnackWeightKg ? storedWeightKg : 0,
      optimalBox.totalWeightKg
    );

    const weightDisplay = `${finalWeightKg.toFixed(2)} kg`;

    const boxName = order.packageBoxName || optimalBox.boxName;
    const boxL = order.packageLength ?? optimalBox.length;
    const boxB = order.packageBreadth ?? optimalBox.breadth;
    const boxH = order.packageHeight ?? optimalBox.height;
    const boxDisplay = `${boxName} (${boxL}×${boxB}×${boxH} cm)`;

    const courierDisplay = order.shipmentId && !/^\d+$/.test(order.shipmentId)
      ? order.shipmentId
      : "Courier Surface";

    // Return to Origin Address (Raghul Delights kitchen in Coimbatore, Tamil Nadu)
    const returnAddress =
      process.env.STORE_RETURN_ADDRESS ||
      "4/664 Kurinji Nagar, Thoppampatti, Coimbatore, Tamil Nadu – 641017, India";
    const returnPhone = process.env.STORE_PHONE || "+91 86678 29041";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shipping Label - ${order.orderNumber}</title>
  <style>
    @page {
      size: 100mm 150mm;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 12mm 10mm;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #000;
      background: #fff;
      box-sizing: border-box;
      width: 100mm;
      height: 150mm;
    }
    .label-box {
      border: 2px solid #000;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      border-bottom: 2px solid #000;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .courier-badge {
      font-size: 12px;
      font-weight: 700;
      border: 1.5px solid #000;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .awb-section {
      border-bottom: 2px solid #000;
      padding: 8px 10px;
      text-align: center;
      background: #fdfdfd;
    }
    .awb-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #333;
    }
    .awb-code {
      font-family: monospace;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      margin: 4px 0;
    }
    .routing {
      font-size: 11px;
      font-weight: 600;
    }
    .to-section {
      padding: 10px;
      border-bottom: 2px solid #000;
      flex: 1;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 4px;
      color: #555;
    }
    .recipient-name {
      font-size: 16px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .address {
      font-size: 12px;
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .pincode {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 1px;
    }
    .phone {
      font-size: 13px;
      font-weight: 700;
      margin-top: 4px;
    }
    .parcel-meta {
      border-bottom: 2px solid #000;
      padding: 6px 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      font-size: 11px;
      background: #fafafa;
    }
    .meta-item strong {
      display: block;
      font-size: 12px;
    }
    .from-section {
      padding: 6px 10px;
      font-size: 10px;
      line-height: 1.3;
      color: #333;
    }
    .from-title {
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="label-box">
    <div class="header">
      <div class="brand">RAGHUL DELIGHTS</div>
      <div class="courier-badge">${courierDisplay}</div>
    </div>

    <div class="awb-section">
      <div class="awb-title">Tracking Number / AWB</div>
      <div class="awb-code">${order.awbCode || "PENDING"}</div>
      <div class="routing">Order: #${order.orderNumber} &bull; PREPAID</div>
    </div>

    <div class="to-section">
      <div class="section-title">SHIP TO:</div>
      <div class="recipient-name">${order.customerName}</div>
      <div class="address">${order.address}<br/>${order.city}, ${order.state}</div>
      <div class="pincode">PIN: ${order.pincode}</div>
      <div class="phone">Tel: ${order.phone}</div>
    </div>

    <div class="parcel-meta">
      <div class="meta-item">
        <span>Package Weight</span>
        <strong>${weightDisplay}</strong>
      </div>
      <div class="meta-item">
        <span>Item Quantity</span>
        <strong>${totalPacks} Packs</strong>
      </div>
      <div class="meta-item" style="grid-column: span 2;">
        <span>Packaging Box</span>
        <strong>${boxDisplay}</strong>
      </div>
    </div>

    <div class="from-section">
      <div class="from-title">RETURN TO (IF UNDELIVERED):</div>
      <strong>Raghul Delights &bull; South Indian Traditional Snacks</strong><br/>
      ${returnAddress} &bull; Tel: ${returnPhone}
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[label] Shipping label generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate label" },
      { status: 500 }
    );
  }
}

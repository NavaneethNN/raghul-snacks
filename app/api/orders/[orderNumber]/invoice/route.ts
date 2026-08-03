import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { orders, orderItems } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { buildInvoiceHtml } from "@/lib/invoice-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getBrowser() {
  // In production / serverless environments use @sparticuz/chromium
  if (process.env.NODE_ENV === "production" || process.env.USE_CHROMIUM_LAMBDA) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  // Local development — use the system Chrome / Chromium
  const puppeteer = await import("puppeteer-core");
  const possiblePaths = [
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];

  const { existsSync } = await import("fs");
  const executablePath = possiblePaths.find((p) => existsSync(p));
  if (!executablePath) {
    throw new Error(
      "No Chrome/Chromium found for local PDF generation. " +
        "Install Google Chrome or set USE_CHROMIUM_LAMBDA=1 to use @sparticuz/chromium.",
    );
  }

  return puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ orderNumber: string }> | { orderNumber: string };
  },
) {
  let browser;
  try {
    // Resolve route params (Next.js 15 makes params a Promise)
    const resolvedParams =
      context.params instanceof Promise ? await context.params : context.params;
    const rawOrderNumber = resolvedParams?.orderNumber;

    // Fallback: parse from URL path
    const orderNumber = (
      rawOrderNumber ||
      new URL(request.url).pathname.split("/").at(-2) // …/[orderNumber]/invoice
    )?.toUpperCase();

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Order number is required" },
        { status: 400 },
      );
    }

    const db = getDb();

    // Fetch order
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

    // Fetch items
    const items = await db
      .select({
        name: orderItems.name,
        quantity: orderItems.quantity,
        price: orderItems.price,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    // Build HTML
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    let logoDataUri = "";
    try {
      const logoPath = join(process.cwd(), "public", "logo.png");
      const logoBytes = readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${logoBytes.toString("base64")}`;
    } catch {
      // logo not found — skip it in the PDF
    }

    const html = buildInvoiceHtml({ ...order, items, logoDataUri });

    // Launch Puppeteer and render PDF
    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    const message =
      error instanceof Error ? error.message : "Unable to generate invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await browser?.close();
  }
}

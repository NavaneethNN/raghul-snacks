import nodemailer, { type Transporter } from "nodemailer";

export type OrderEmailData = {
  customerName: string;
  customerEmail: string;
  phone?: string | null;
  orderNumber: string;
  items: Array<{
    name: string;
    weight?: string | null;
    quantity: number;
    price: number; // per unit
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod?: string;
};

const fmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

/**
 * Creates and returns a nodemailer transporter configured from environment variables.
 * Supports:
 * - Brevo SMTP (host: smtp-relay.brevo.com, port 587)
 * - Custom SMTP via SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - Gmail SMTP via SMTP_HOST=smtp.gmail.com, port 465
 */
export function getMailTransporter(): Transporter | null {
  const host = (process.env.SMTP_HOST || "smtp-relay.brevo.com").trim();
  const port = Number(process.env.SMTP_PORT) || (host.includes("gmail") ? 465 : 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  const user = (process.env.SMTP_USER || process.env.BREVO_LOGIN_EMAIL || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.BREVO_SMTP_KEY || "").trim();

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://raghulsnacks.com";
}

/**
 * Builds the customer-facing order confirmation HTML email.
 */
export function buildOrderEmailHtml(data: OrderEmailData): string {
  const appUrl = getAppBaseUrl();
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(data.orderNumber)}${data.phone ? `&phone=${encodeURIComponent(data.phone)}` : ""}`;

  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #f0ede8;font-size:14px;color:#243127;">
        <strong>${item.name}</strong>
        ${item.weight ? `<br><span style="font-size:12px;color:#8c9388;">${item.weight}</span>` : ""}
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #f0ede8;font-size:14px;color:#6b7280;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #f0ede8;font-size:14px;color:#243127;text-align:right;font-weight:600;">${fmt.format(item.price * item.quantity)}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Order Confirmed – ${data.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'DM Sans',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #eee9e0;">

        <!-- Header -->
        <tr><td style="background:#243127;padding:32px 36px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#b6d4a0;font-weight:700;">Raghul Delights</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Order Confirmed!</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#cbd5e1;">Fresh handcrafted snacks are on their way to you</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 36px;">

          <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
            Hi <strong style="color:#243127;">${data.customerName}</strong>,<br>
            Thank you for shopping with Raghul Delights! Your order has been placed successfully and is being freshly prepared with our heirloom family recipes.
          </p>

          <!-- Order Summary Card -->
          <div style="background:#fcfaf6;border:1px solid #ebd9c8;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:top;">
                  <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8c9388;font-weight:700;">Order Number</span>
                  <div style="font-size:20px;font-weight:700;color:#c95f3b;letter-spacing:0.02em;margin-top:2px;">${data.orderNumber}</div>
                </td>
                <td style="text-align:right;vertical-align:top;">
                  <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8c9388;font-weight:700;">Payment Status</span>
                  <div style="font-size:13px;font-weight:700;color:#16a34a;margin-top:4px;">
                    ✓ Paid Online
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Track Order CTA Button -->
          <div style="text-align:center;margin:0 0 28px;padding:20px;background:#f7f5f0;border-radius:12px;border:1px dashed #d5cfc5;">
            <p style="margin:0 0 12px;font-size:13.5px;color:#374151;font-weight:600;">
              Want to see real-time updates for your order?
            </p>
            <a href="${trackUrl}" target="_blank" style="display:inline-block;background:#c95f3b;color:#ffffff;font-size:14.5px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:10px;box-shadow:0 4px 12px rgba(201,95,59,0.3);letter-spacing:0.01em;">
              Track Your Order Live →
            </a>
            <p style="margin:10px 0 0;font-size:11.5px;color:#8c9388;">
              Direct link: <a href="${trackUrl}" style="color:#c95f3b;word-break:break-all;">${trackUrl}</a>
            </p>
          </div>

          <!-- Items Table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #ebd9c8;border-radius:10px;overflow:hidden;border-collapse:collapse;">
            <thead>
              <tr style="background:#fcfaf6;border-bottom:1px solid #ebd9c8;">
                <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8c9388;font-weight:700;text-align:left;">Item</th>
                <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8c9388;font-weight:700;text-align:center;">Qty</th>
                <th style="padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8c9388;font-weight:700;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Subtotal</td>
              <td style="padding:6px 0;font-size:14px;color:#243127;text-align:right;">${fmt.format(data.subtotal)}</td>
            </tr>
            ${
              data.discount > 0
                ? `<tr>
              <td style="padding:6px 0;font-size:14px;color:#16a34a;">Discount${data.couponCode ? ` (${data.couponCode})` : ""}</td>
              <td style="padding:6px 0;font-size:14px;color:#16a34a;text-align:right;">− ${fmt.format(data.discount)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#6b7280;">Delivery Charge</td>
              <td style="padding:6px 0;font-size:14px;color:#243127;text-align:right;">${data.shipping > 0 ? fmt.format(data.shipping) : "FREE"}</td>
            </tr>
            <tr>
              <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#243127;border-top:2px solid #f0ede8;">Total Amount Paid</td>
              <td style="padding:12px 0 0;font-size:18px;font-weight:800;color:#c95f3b;text-align:right;border-top:2px solid #f0ede8;">${fmt.format(data.total)}</td>
            </tr>
          </table>

          <!-- Delivery Address -->
          <div style="background:#f7f5f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#8c9388;font-weight:700;">Delivering to</p>
            <p style="margin:0;font-size:14px;color:#243127;line-height:1.6;">
              <strong>${data.customerName}</strong><br>
              ${data.address}<br>
              ${data.city}, ${data.state} – ${data.pincode}
              ${data.phone ? `<br><span style="font-size:13px;color:#6b7280;">Contact: +91 ${data.phone}</span>` : ""}
            </p>
          </div>

          <!-- Fresh Prep Note -->
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
              <strong>Made fresh for you:</strong> Your snacks are prepared in small batches after your order is placed to ensure maximum crunch, freshness, and authentic taste. Please allow 2–3 business days for preparation before dispatch.
            </p>
          </div>

          <!-- Help & Support -->
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;border-top:1px solid #f0ede8;padding-top:18px;">
            Have questions or special instructions?<br>
            WhatsApp us at <a href="https://wa.me/918667829041" style="color:#c95f3b;font-weight:600;text-decoration:none;">+91 86678 29041</a>
            or email <a href="mailto:raghuldelights@gmail.com" style="color:#c95f3b;font-weight:600;text-decoration:none;">raghuldelights@gmail.com</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f7f5f0;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;border-top:1px solid #ebd9c8;">
          <p style="margin:0;font-size:12px;color:#8c9388;">© ${new Date().getFullYear()} Raghul Delights · Homemade • Fresh • Traditional<br>Coimbatore, Tamil Nadu, India</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the store owner / admin notification HTML email.
 */
export function buildAdminNotificationHtml(data: OrderEmailData): string {
  const appUrl = getAppBaseUrl();
  const adminOrdersUrl = `${appUrl}/admin/orders`;
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(data.orderNumber)}${data.phone ? `&phone=${encodeURIComponent(data.phone)}` : ""}`;

  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;">
        <strong>${item.name}</strong> ${item.weight ? `(${item.weight})` : ""}
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;">${fmt.format(item.price * item.quantity)}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>New Order Alert – ${data.orderNumber}</title></head>
<body style="font-family:'DM Sans',Arial,sans-serif;background:#faf8f5;padding:24px;color:#243127;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #ebd9c8;">
    <div style="background:#c95f3b;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;font-size:16px;margin-bottom:20px;">
      🎉 New Order Received: ${data.orderNumber}
    </div>

    <p style="font-size:14px;margin:0 0 14px;">
      A customer just completed an order on <strong>Raghul Delights</strong>:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;font-size:13px;background:#f7f5f0;padding:12px;border-radius:8px;">
      <tr><td><strong>Customer:</strong></td><td>${data.customerName}</td></tr>
      <tr><td><strong>Phone:</strong></td><td><a href="tel:+91${data.phone}">+91 ${data.phone || "—"}</a></td></tr>
      <tr><td><strong>Email:</strong></td><td>${data.customerEmail}</td></tr>
      <tr><td><strong>Address:</strong></td><td>${data.address}, ${data.city}, ${data.state} – ${data.pincode}</td></tr>
      <tr><td><strong>Total Paid:</strong></td><td><strong style="color:#c95f3b;">${fmt.format(data.total)}</strong> (Paid Online)</td></tr>
    </table>

    <h4 style="margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:#8c9388;">Items to pack:</h4>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#fcfaf6;border-bottom:1px solid #eee;">
          <th style="padding:8px 10px;text-align:left;">Item</th>
          <th style="padding:8px 10px;text-align:center;">Qty</th>
          <th style="padding:8px 10px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="text-align:center;margin-top:20px;">
      <a href="${adminOrdersUrl}" style="display:inline-block;background:#243127;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:13.5px;font-weight:700;margin-right:10px;">
        Open Admin Orders →
      </a>
      <a href="${trackUrl}" style="display:inline-block;background:#ffffff;border:1.5px solid #c95f3b;color:#c95f3b;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13.5px;font-weight:700;">
        Track Order Page
      </a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends order confirmation emails to BOTH:
 * 1) Customer (with track order link and essential order details)
 * 2) Store Admin (new order packing alert)
 */
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn(
      "[email] SMTP credentials not set (missing BREVO_LOGIN_EMAIL/SMTP_USER or BREVO_SMTP_KEY/SMTP_PASS in .env). Skipping email."
    );
    return;
  }

  const senderEmail = (
    process.env.BREVO_SENDER_EMAIL ||
    process.env.SMTP_FROM_EMAIL ||
    process.env.BREVO_LOGIN_EMAIL ||
    "orders@raghuldelights.com"
  ).trim();

  const senderName = (
    process.env.BREVO_SENDER_NAME ||
    process.env.SMTP_FROM_NAME ||
    "Raghul Delights"
  ).trim();

  const adminEmail = (
    process.env.BREVO_ADMIN_EMAIL ||
    process.env.SMTP_ADMIN_EMAIL ||
    "raghuldelights@gmail.com"
  ).trim();

  // 1. Send confirmation email to Customer
  if (data.customerEmail && data.customerEmail.includes("@")) {
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: data.customerEmail,
        replyTo: adminEmail,
        subject: `Order Confirmed – ${data.orderNumber} | Raghul Delights`,
        html: buildOrderEmailHtml(data),
      });
      console.log(`[email] ✓ Order confirmation sent to customer ${data.customerEmail} (${data.orderNumber})`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[email] ✗ Failed to send customer email to ${data.customerEmail}:`, errorMsg);
      if (errorMsg.includes("535") || errorMsg.includes("Authentication failed")) {
        console.error(
          "[email] 💡 Brevo Authentication Failed (535): Please check your Brevo account (Settings > SMTP & API > SMTP tab). Verify that the 'Login' and 'SMTP Key' match your .env values, and that transactional sending is enabled on your Brevo account."
        );
      }
    }
  }

  // 2. Send order notification alert to Store Admin / Receiver
  if (adminEmail && adminEmail.includes("@") && adminEmail !== data.customerEmail) {
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: adminEmail,
        subject: `[New Order] ${data.orderNumber} – ₹${data.total} by ${data.customerName}`,
        html: buildAdminNotificationHtml(data),
      });
      console.log(`[email] ✓ Admin notification sent to ${adminEmail} (${data.orderNumber})`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[email] ✗ Failed to send admin notification to ${adminEmail}:`, errorMsg);
    }
  }
}

import nodemailer from "nodemailer";

// Brevo SMTP relay — port 587, STARTTLS
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_LOGIN_EMAIL!,  // your Brevo account login email
    pass: process.env.BREVO_SMTP_KEY!,     // Brevo SMTP key
  },
});

export type OrderEmailData = {
  customerName: string;
  customerEmail: string;
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
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

function buildOrderEmailHtml(data: OrderEmailData): string {
  const itemRows = data.items.map((item) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:14px;color:#243127;">
        <strong>${item.name}</strong>
        ${item.weight ? `<br><span style="font-size:12px;color:#9ca396;">${item.weight}</span>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:14px;color:#6b7280;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ede8;font-size:14px;color:#243127;text-align:right;">${fmt.format(item.price * item.quantity)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order Confirmation</title></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#243127;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b6d4a0;font-weight:600;">Raghul Delights</p>
          <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Order Confirmed!</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:32px 40px;">

          <p style="margin:0 0 24px;font-size:15px;color:#687267;line-height:1.6;">
            Hi <strong style="color:#243127;">${data.customerName}</strong>,<br>
            Thank you for your order! We&apos;re freshly preparing your snacks and will dispatch them soon.
          </p>

          <!-- Order number -->
          <div style="background:#f7f5f0;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#9ca396;font-weight:600;">Order Number</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:#243127;letter-spacing:0.04em;">${data.orderNumber}</p>
          </div>

          <!-- Items table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #f0ede8;border-radius:10px;overflow:hidden;">
            <thead>
              <tr style="background:#faf8f5;">
                <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca396;font-weight:600;text-align:left;">Item</th>
                <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca396;font-weight:600;text-align:center;">Qty</th>
                <th style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca396;font-weight:600;text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <!-- Totals -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#687267;">Subtotal</td>
              <td style="padding:5px 0;font-size:14px;color:#243127;text-align:right;">${fmt.format(data.subtotal)}</td>
            </tr>
            ${data.discount > 0 ? `<tr>
              <td style="padding:5px 0;font-size:14px;color:#3a6b2a;">Discount${data.couponCode ? ` (${data.couponCode})` : ""}</td>
              <td style="padding:5px 0;font-size:14px;color:#3a6b2a;text-align:right;">− ${fmt.format(data.discount)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:5px 0;font-size:14px;color:#687267;">Delivery</td>
              <td style="padding:5px 0;font-size:14px;color:#243127;text-align:right;">${data.shipping > 0 ? fmt.format(data.shipping) : "Free"}</td>
            </tr>
            <tr>
              <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#243127;border-top:2px solid #f0ede8;">Total</td>
              <td style="padding:12px 0 0;font-size:18px;font-weight:700;color:#243127;text-align:right;border-top:2px solid #f0ede8;">${fmt.format(data.total)}</td>
            </tr>
          </table>

          <!-- Delivery address -->
          <div style="background:#f7f5f0;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
            <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#9ca396;font-weight:600;">Delivering to</p>
            <p style="margin:0;font-size:14px;color:#243127;line-height:1.6;">
              ${data.address}<br>${data.city}, ${data.state} – ${data.pincode}
            </p>
          </div>

          <!-- Prep note -->
          <div style="background:#f0f7ec;border-left:3px solid #7aad5e;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
            <p style="margin:0;font-size:13px;color:#3a6b2a;line-height:1.6;">
              <strong>Made fresh for you.</strong> Your snacks are prepared after your order is placed. Please allow 2–3 business days for preparation before dispatch.
            </p>
          </div>

          <p style="margin:0;font-size:13px;color:#9ca396;line-height:1.6;">
            Questions? WhatsApp us at <a href="https://wa.me/918667829041" style="color:#c95f3b;text-decoration:none;">+91 86678 29041</a>
            or email <a href="mailto:raghuldelights@gmail.com" style="color:#c95f3b;text-decoration:none;">raghuldelights@gmail.com</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f7f5f0;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca396;">© ${new Date().getFullYear()} Raghul Delights · Coimbatore, Tamil Nadu</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  if (!process.env.BREVO_SMTP_KEY || !process.env.BREVO_LOGIN_EMAIL || !process.env.BREVO_SENDER_EMAIL) {
    console.warn("[email] Brevo env vars not fully set — skipping order confirmation email.");
    return;
  }

  if (!data.customerEmail) {
    console.warn("[email] No customer email — skipping order confirmation.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.BREVO_SENDER_NAME || "Raghul Delights"}" <${process.env.BREVO_SENDER_EMAIL}>`,
      to: data.customerEmail,
      replyTo: process.env.BREVO_ADMIN_EMAIL || process.env.BREVO_SENDER_EMAIL,
      bcc: process.env.BREVO_ADMIN_EMAIL || undefined,
      subject: `Order Confirmed – ${data.orderNumber} | Raghul Delights`,
      html: buildOrderEmailHtml(data),
    });
    console.log(`[email] Order confirmation sent to ${data.customerEmail} for ${data.orderNumber}`);
  } catch (err) {
    // Non-fatal — log and continue. Order is already saved.
    console.error("[email] Failed to send order confirmation:", err);
  }
}

export type InvoiceData = {
  orderNumber: string;
  createdAt: Date;
  orderStatus: string;
  paymentStatus: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  couponCode: string | null;
  discount: string | number;
  total: string | number;
  items: Array<{
    name: string;
    quantity: number;
    price: string | number;
  }>;
};

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const statusLabel: Record<string, string> = {
  placed:    "Order Placed",
  packed:    "Packed",
  shipped:   "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const paymentLabel: Record<string, string> = {
  paid:     "Paid",
  pending:  "Pending",
  failed:   "Failed",
  refunded: "Refunded",
};

// Site's rust-orange terracotta — the one accent colour used throughout
const BRAND = "#c95f3b";

export function buildInvoiceHtml(data: InvoiceData): string {
  const subtotal = data.items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const discount = Number(data.discount) || 0;
  const total    = Number(data.total);
  const shipping = total - subtotal + discount;

  const orderDate = new Date(data.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const itemRows = data.items
    .map((item, idx) => {
      const lineTotal = Number(item.price) * item.quantity;
      return /* html */ `
      <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
        <td class="item-name">${escapeHtml(item.name)}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${INR(Number(item.price))}</td>
        <td class="right bold">${INR(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(data.orderNumber)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
      padding: 40px 48px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid ${BRAND};
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand-name {
      font-size: 26px;
      font-weight: 800;
      color: ${BRAND};
      letter-spacing: -0.5px;
    }
    .brand-tagline {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }
    .invoice-label { text-align: right; }
    .invoice-label h2 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .invoice-label p {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* ── Meta grid ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .meta-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 18px;
    }
    .meta-box h3 {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 5px;
    }
    .meta-row span  { color: #6b7280; }
    .meta-row strong { color: #1a1a1a; text-align: right; }

    /* ── Status badges ── */
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-paid      { background:#d1fae5; color:#065f46; }
    .badge-pending   { background:#fef3c7; color:#92400e; }
    .badge-failed    { background:#fee2e2; color:#991b1b; }
    .badge-refunded  { background:#ede9fe; color:#5b21b6; }
    .badge-delivered { background:#d1fae5; color:#065f46; }
    .badge-placed    { background:#dbeafe; color:#1e40af; }
    .badge-shipped   { background:#e0f2fe; color:#0369a1; }
    .badge-packed    { background:#fef9c3; color:#854d0e; }
    .badge-cancelled { background:#fee2e2; color:#991b1b; }

    /* ── Items table ── */
    .table-wrap {
      margin-bottom: 24px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      background: ${BRAND};
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 11px 14px;
      text-align: left;
    }
    thead th.center { text-align: center; }
    thead th.right  { text-align: right; }
    tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
      color: #1a1a1a;
    }
    tbody tr:last-child td { border-bottom: none; }
    .row-even { background: #fff; }
    .row-odd  { background: #f9fafb; }
    .item-name { font-weight: 500; max-width: 260px; }
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: 700; }

    /* ── Totals ── */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .totals { width: 260px; }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    .totals-row span { color: #6b7280; }
    .totals-grand {
      display: flex;
      justify-content: space-between;
      padding: 10px 0 6px;
      font-size: 16px;
      font-weight: 700;
      color: ${BRAND};
      border-top: 2px solid ${BRAND};
      margin-top: 4px;
    }

    /* ── Footer ── */
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 18px;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
      line-height: 1.8;
    }
    .footer strong { color: #6b7280; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">Raghul Delights</div>
      <div class="brand-tagline">Fresh &amp; Authentic South Indian Snacks</div>
    </div>
    <div class="invoice-label">
      <h2>Invoice</h2>
      <p># ${escapeHtml(data.orderNumber)}</p>
      <p>${orderDate}</p>
    </div>
  </div>

  <!-- Meta grid -->
  <div class="meta-grid">
    <div class="meta-box">
      <h3>Bill To</h3>
      <div style="font-weight:600;font-size:14px;margin-bottom:6px;color:#1a1a1a;">${escapeHtml(data.customerName)}</div>
      <div style="color:#374151;">${escapeHtml(data.address)}</div>
      <div style="color:#374151;">${escapeHtml(data.city)}, ${escapeHtml(data.state)} &ndash; ${escapeHtml(data.pincode)}</div>
      <div style="color:#374151;margin-top:4px;">${escapeHtml(data.phone)}</div>
      ${data.email ? `<div style="color:#374151;">${escapeHtml(data.email)}</div>` : ""}
    </div>

    <div class="meta-box">
      <h3>Order Details</h3>
      <div class="meta-row">
        <span>Order number</span>
        <strong>${escapeHtml(data.orderNumber)}</strong>
      </div>
      <div class="meta-row">
        <span>Order date</span>
        <strong>${orderDate}</strong>
      </div>
      <div class="meta-row">
        <span>Order status</span>
        <strong>
          <span class="badge badge-${escapeHtml(data.orderStatus)}">
            ${escapeHtml(statusLabel[data.orderStatus] ?? data.orderStatus)}
          </span>
        </strong>
      </div>
      <div class="meta-row">
        <span>Payment</span>
        <strong>
          <span class="badge badge-${escapeHtml(data.paymentStatus)}">
            ${escapeHtml(paymentLabel[data.paymentStatus] ?? data.paymentStatus)}
          </span>
        </strong>
      </div>
      ${data.couponCode ? `
      <div class="meta-row">
        <span>Coupon</span>
        <strong style="color:${BRAND};">${escapeHtml(data.couponCode)}</strong>
      </div>` : ""}
    </div>
  </div>

  <!-- Items table -->
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="center">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
  </div>

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${INR(subtotal)}</span>
      </div>
      ${shipping > 0
        ? `<div class="totals-row"><span>Shipping</span><span>${INR(shipping)}</span></div>`
        : `<div class="totals-row"><span>Shipping</span><span style="color:#059669;">Free</span></div>`
      }
      ${discount > 0
        ? `<div class="totals-row"><span>Discount${data.couponCode ? ` (${escapeHtml(data.couponCode)})` : ""}</span><span style="color:#059669;">&minus; ${INR(discount)}</span></div>`
        : ""
      }
      <div class="totals-grand">
        <span>Total</span>
        <span>${INR(total)}</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <strong>Raghul Delights</strong><br/>
    hello@raghulsnacks.com &nbsp;&middot;&nbsp; +91 86678 29041<br/>
    Thank you for shopping with us!
  </div>

</body>
</html>`;
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

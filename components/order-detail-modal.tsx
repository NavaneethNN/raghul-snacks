"use client";

import { useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────── */
type Order = {
  id: number;
  orderNumber: string;
  total: string;
  discount: string;
  couponCode: string | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    productId: number | null;
    name: string;
    quantity: number;
    price: string;
    product: {
      id: number;
      name: string;
      slug: string;
      description: string;
      ingredients: string | null;
      price: string;
      offerPrice: string | null;
      weight: string;
      categoryId: number | null;
      image: string | null;
      stock: number;
      featured: boolean;
      bestseller: boolean;
    } | null;
  }>;
};

type ReviewState = { canReview: boolean; existingRating: number };

interface Props {
  order: Order;
  onClose: () => void;
  onDownloadInvoice: (orderNumber: string) => void;
  onBuyAgain: (order: Order) => void;
}

/* ── Star picker ─────────────────────────────────────── */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{ background: "none", border: "none", fontSize: 32, cursor: "pointer", color: n <= (hover || value) ? "#e5a52f" : "#ddd", padding: "0 2px", lineHeight: 1 }}
          aria-label={`${n} star`}
        >★</button>
      ))}
    </div>
  );
}

/* ── Price helpers ───────────────────────────────────── */
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const fmt = (n: number) => INR.format(n);

const statusColour: Record<string, { bg: string; color: string }> = {
  placed:    { bg: "#fef3c7", color: "#92400e" },
  packed:    { bg: "#dbeafe", color: "#1e40af" },
  shipped:   { bg: "#dcfce7", color: "#166534" },
  delivered: { bg: "#d1fae5", color: "#065f46" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
  paid:      { bg: "#d1fae5", color: "#065f46" },
  pending:   { bg: "#fef3c7", color: "#92400e" },
};

function Badge({ label }: { label: string }) {
  const c = statusColour[label.toLowerCase()] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ background: c.bg, color: c.color, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

/* ── Main component ──────────────────────────────────── */
export function OrderDetailModal({ order, onClose, onDownloadInvoice, onBuyAgain }: Props) {
  const [reviewStates, setReviewStates] = useState<Record<string, ReviewState>>({});
  // Which product is currently being reviewed (productId), null = none
  const [reviewingPid, setReviewingPid] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  // Set of productIds that have been reviewed in this session
  const [donePids, setDonePids] = useState<Set<number>>(new Set());

  const isDelivered = order.orderStatus === "delivered";

  // Fetch review states for all products in this order
  useEffect(() => {
    if (!isDelivered) return;
    const pids = order.items.map((i) => i.product?.id).filter(Boolean) as number[];
    if (!pids.length) return;

    fetch("/api/reviews/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: pids, orderId: order.id }),
    })
      .then((r) => r.json())
      .then((data: Record<number, ReviewState>) => setReviewStates(data))
      .catch(() => {});
  }, [order.id, isDelivered]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { if (reviewingPid !== null) { cancelReview(); } else { onClose(); } } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, reviewingPid]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Compute price breakdown
  const subtotal = order.items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
  const discount = parseFloat(order.discount) || 0;
  const total = parseFloat(order.total);
  const shipping = total - subtotal + discount;

  // Items that have not been reviewed for this order yet (excluding session-submitted)
  const reviewableItems = order.items.filter((item) => {
    const pid = item.product?.id;
    if (!pid) return false;
    if (donePids.has(pid)) return false;
    return reviewStates[pid]?.canReview === true;
  });

  function startReview(pid: number) {
    setReviewingPid(pid);
    setRating(0);
    setContent("");
    setReviewError("");
  }

  function cancelReview() {
    setReviewingPid(null);
    setRating(0);
    setContent("");
    setReviewError("");
  }

  async function submitReview() {
    if (!reviewingPid) return;
    if (!rating) { setReviewError("Please choose a star rating."); return; }
    if (!content.trim()) { setReviewError("Please write something about this product."); return; }

    setSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: reviewingPid, orderId: order.id, rating, content }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit review.");
      setDonePids((prev) => new Set([...prev, reviewingPid]));
      setReviewingPid(null);
      setRating(0);
      setContent("");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const reviewingItem = reviewingPid !== null
    ? order.items.find((i) => i.product?.id === reviewingPid)
    : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(36,49,39,0.55)", zIndex: 10002, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { if (reviewingPid !== null) cancelReview(); else onClose(); } }}
    >
      <div className="order-detail-sheet" style={{
        background: "var(--paper)",
        width: "100%",
        maxWidth: 680,
        maxHeight: "92vh",
        borderRadius: "16px 16px 0 0",
        overflowY: "auto",
        animation: "slideUpIn 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
      }}>
        <style>{`
          @keyframes slideUpIn{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
          .order-detail-sheet{scrollbar-width:thin;scrollbar-color:var(--line) transparent;}
          .order-detail-sheet::-webkit-scrollbar{width:4px;}
          .order-detail-sheet::-webkit-scrollbar-track{background:transparent;}
          .order-detail-sheet::-webkit-scrollbar-thumb{background:var(--line);border-radius:4px;}
          .order-detail-sheet::-webkit-scrollbar-thumb:hover{background:#c4c4c4;}
        `}</style>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 20px 0", position: "sticky", top: 0, background: "var(--paper)", zIndex: 1, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>Order Details</p>
            <h2 style={{ margin: 0, fontFamily: "'DM Sans',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.01em" }}>{order.orderNumber}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 6 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              {order.paymentMethod && (
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                  {({ upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking", wallet: "Wallet", emi: "EMI", online: "Online Payment", cod: "Cash on Delivery" } as Record<string, string>)[order.paymentMethod]
                    ?? order.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge label={order.orderStatus} />
            <Badge label={order.paymentStatus} />
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4, display: "flex" }} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: "20px" }}>

          {/* ── Items ── */}
          <section style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 12px", fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9ca3af" }}>Items</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {order.items.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px" }}>
                  {item.product?.image && (
                    <img src={item.product.image} alt={item.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                    {item.product?.weight && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af", fontFamily: "'DM Mono',monospace" }}>{item.product.weight}</p>}
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>Qty {item.quantity}</p>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{fmt(parseFloat(item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Price breakdown ── */}
          <section style={{ marginBottom: 20, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
            {[
              { label: "Subtotal", value: fmt(subtotal) },
              { label: "Shipping", value: shipping > 0 ? fmt(shipping) : "Free", green: shipping === 0 },
              ...(discount > 0 ? [{ label: `Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, value: `− ${fmt(discount)}`, green: true }] : []),
              { label: "Payment mode", value: (({ upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking", wallet: "Wallet", emi: "EMI", online: "Online Payment", cod: "Cash on Delivery" } as Record<string, string>)[order.paymentMethod ?? "online"] ?? (order.paymentMethod ?? "Online Payment")) },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: "1px solid var(--line)", background: "var(--paper)", fontSize: 13 }}>
                <span style={{ color: "#6b7280" }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.green ? "#15803d" : "var(--ink)" }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "var(--ink)" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#b8c6a7" }}>Total Paid</span>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 700, color: "#e5a52f" }}>{fmt(total)}</span>
            </div>
          </section>

          {/* ── Savings banner ── */}
          {discount > 0 && (
            <div style={{
              background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
              border: "1.5px solid #f59e0b",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {/* Sparkle / celebration SVG */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z"/>
                  <path d="M5 16l.8 2.4L8 19.2l-2.2.8L5 22.4l-.8-2.4L2 19.2l2.2-.8L5 16z"/>
                  <path d="M19 2l.6 1.8L21.4 4.4l-1.8.6L19 6.8l-.6-1.8L16.6 4.4l1.8-.6L19 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                  You saved {fmt(discount)} on this order!
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#b45309" }}>
                  Great deal — keep saving with more orders.
                </p>
              </div>
              <div style={{ fontSize: 20, flexShrink: 0, display: "flex", gap: 2 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
                </svg>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" style={{ alignSelf: "flex-end", marginBottom: 2 }}>
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
                </svg>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
                </svg>
              </div>
            </div>
          )}

          {/* ── Write a review — delivered, unreviewed products ── */}
          {isDelivered && reviewingPid === null && reviewableItems.length > 0 && (
            <section style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>Write a Review</p>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#687267" }}>Tap a product to share your experience.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reviewableItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => startReview(item.product!.id)}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "11px 14px", cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
                  >
                    {item.product?.image && (
                      <img src={item.product.image} alt={item.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: "var(--terracotta)", fontWeight: 600, whiteSpace: "nowrap" }}>Write review →</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── Inline review form ── */}
          {isDelivered && reviewingPid !== null && reviewingItem && (
            <section style={{ background: "var(--cream)", border: "1.5px solid var(--terracotta)", borderRadius: 10, padding: "20px 18px", marginBottom: 20 }}>
              {/* Product being reviewed */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, padding: "10px 12px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8 }}>
                {reviewingItem.product?.image && (
                  <img src={reviewingItem.product.image} alt={reviewingItem.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{reviewingItem.name}</span>
              </div>

              <p style={{ margin: "0 0 12px", fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>Your Review</p>

              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Rating</p>
                <StarPicker value={rating} onChange={setRating} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Review</p>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What did you think of this product?"
                  rows={4}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid var(--line)", borderRadius: 8, font: "14px 'DM Sans',sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", background: "var(--paper)" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
                />
              </div>

              {reviewError && <p style={{ margin: "0 0 10px", fontSize: 13, color: "#dc2626" }}>{reviewError}</p>}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submitting}
                  style={{ flex: 1, background: "var(--terracotta)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", font: "600 14px 'DM Sans',sans-serif", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
                <button
                  type="button"
                  onClick={cancelReview}
                  style={{ background: "none", border: "1.5px solid var(--line)", borderRadius: 8, padding: "12px 18px", font: "600 14px 'DM Sans',sans-serif", cursor: "pointer", color: "var(--ink)" }}
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {/* ── All reviewed banner ── */}
          {isDelivered && reviewingPid === null && reviewableItems.length === 0 && order.items.some((i) => i.product?.id) && (
            <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#166534", fontWeight: 500 }}>
              You&apos;ve reviewed all products in this order. Thank you!
            </div>
          )}

          {/* ── Action buttons ── */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => { onBuyAgain(order); onClose(); }}
              style={{ flex: 1, background: "var(--terracotta)", color: "#fff", border: "none", borderRadius: 8, padding: "11px", font: "600 13px 'DM Sans',sans-serif", cursor: "pointer" }}
            >
              Buy Again
            </button>
            <button
              onClick={() => onDownloadInvoice(order.orderNumber)}
              style={{ flex: 1, background: "var(--paper)", border: "1.5px solid var(--line)", color: "var(--ink)", borderRadius: 8, padding: "11px", font: "600 13px 'DM Sans',sans-serif", cursor: "pointer" }}
            >
              Download Invoice
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

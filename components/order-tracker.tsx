"use client";

import { FormEvent, useEffect, useState } from "react";
import { normalizeIndianPhone, isValidIndianPhone } from "@/lib/phone";
import styles from "./order-tracker.module.css";

type TrackingActivity = {
  date: string;
  status: string;
  activity: string;
  location: string;
};

type Result = {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  awbCode?: string | null;
  courierName?: string | null;
  trackingUrl?: string | null;
  packageBoxName?: string | null;
  tracking?: {
    currentStatus?: string;
    courierName?: string;
    estimatedDeliveryDate?: string | null;
    activities?: TrackingActivity[];
  } | null;
};

const labels: Record<string, string> = {
  placed: "Order placed",
  packed: "Packed & ready",
  dispatched: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function GuestReviewForm({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!rating) { setError("Please select a star rating."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phone: normalizeIndianPhone(phone), customerName: name.trim(), rating, content: comment.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");
      setSubmitted(true);
      try {
        localStorage.setItem("review-posted", "true");
        localStorage.setItem("delivery-nudge-dismissed", "true");
        sessionStorage.setItem("delivery-nudge-dismissed", "true");
        localStorage.setItem("delivery-notification-dismissed-permanently", "true");
        localStorage.setItem(`reviewed-order-${orderNumber}`, "true");
      } catch {}
      window.dispatchEvent(new Event("review-submitted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return (
    <div style={{ marginTop: 20, padding: "14px 18px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, fontSize: 14, color: "#166534", display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>Thank you for your review!</span>
    </div>
  );

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 600 }}>Your Experience</p>
      <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "var(--ink)", fontFamily: "'Playfair Display',serif" }}>Leave us a review</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Your Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter your name"
            required
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Rating *</label>
          <div style={{ display: "flex", gap: 4 }}>
            {[1,2,3,4,5].map(star => (
              <button key={star} type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                style={{ background: "none", border: "none", fontSize: 30, cursor: "pointer", color: star <= (hovered || rating) ? "#e5a52f" : "#d1d5db", lineHeight: 1, padding: "2px", transition: "color 0.1s" }}
                aria-label={`${star} star`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Comment <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="How was your experience?"
            style={{ width: "100%", padding: "9px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>
        {error && <p style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>{error}</p>}
        <button type="submit" disabled={submitting} className="button button-dark" style={{ alignSelf: "flex-start" }}>
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </div>
  );
}

export function OrderTracker({ initialOrder, initialPhone }: { initialOrder?: string; initialPhone?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder || "");
  const [phone, setPhone] = useState(initialPhone || "");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (
      initialOrder &&
      initialPhone &&
      /^RS-[A-Za-z0-9-]+$/i.test(initialOrder) &&
      isValidIndianPhone(initialPhone)
    ) {
      const cleanPhone = normalizeIndianPhone(initialPhone);
      setLoading(true);
      fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: initialOrder.trim(), phone: cleanPhone }),
      })
        .then(async (res) => {
          const data = (await res.json()) as { order?: Result; error?: string };
          if (res.ok && data.order) {
            setResult(data.order);
          } else if (data.error) {
            setError(data.error);
          }
        })
        .catch(() => setError("Unable to connect to order tracker."))
        .finally(() => setLoading(false));
    }
  }, [initialOrder, initialPhone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    // Client-side validation
    if (!orderNumber.trim()) {
      setError("Please enter your order number.");
      return;
    }
    if (!/^RS-[A-Za-z0-9-]+$/i.test(orderNumber)) {
      setError("Please enter a valid order number (e.g. RS-12345678).");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your mobile number.");
      return;
    }
    if (!isValidIndianPhone(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210 or +91 98765 43210).");
      return;
    }

    const cleanPhone = normalizeIndianPhone(phone);
    setLoading(true);

    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), phone: cleanPhone })
      });
      const data = await response.json() as { order?: Result; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "Unable to find your order.");
      setResult(data.order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to find your order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.formSection}>
          <p className="eyebrow">Order tracking</p>
          <h1>Where&apos;s my order?</h1>
          <p className={styles.subtitle}>Enter your order details to check the latest delivery status.</p>

          <form className={styles.form} onSubmit={submit}>
            <div className={styles.field}>
              <label>Order number</label>
              <input
                required
                placeholder="RS-12345678"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value.toUpperCase())}
              />
              <small>Found in your order confirmation email</small>
            </div>

            <div className={styles.field}>
              <label>Mobile number</label>
              <input
                required
                type="tel"
                inputMode="tel"
                placeholder="10-digit mobile (e.g. 9876543210 or +91 98765 43210)"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={() => {
                  if (phone && isValidIndianPhone(phone)) {
                    setPhone(normalizeIndianPhone(phone));
                  }
                }}
              />
              <small>Used during checkout (with or without +91 or leading 0)</small>
            </div>

            {error && (
              <div className={styles.error}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
                    Need help? WhatsApp us at{" "}
                    <a
                      href="https://wa.me/918667829041"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      +91 86678 29041
                    </a>
                  </p>
                </div>
              </div>
            )}

            <button className="button button-dark" disabled={loading}>
              {loading ? "Checking…" : "Track order"}
            </button>
          </form>
        </div>

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.statusCard}>
              <div className={styles.statusIcon}>
                {result.orderStatus === "delivered"
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : result.orderStatus === "cancelled"
                  ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                }
              </div>
              <p className="eyebrow">Latest update</p>
              <h2>{labels[result.orderStatus] || "Order received"}</h2>

              <div className={styles.orderDetails}>
                <div className={styles.detail}>
                  <span>Order number</span>
                  <strong>{result.orderNumber}</strong>
                </div>
                <div className={styles.detail}>
                  <span>Order date</span>
                  <strong>{new Date(result.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}</strong>
                </div>
                <div className={styles.detail}>
                  <span>Payment status</span>
                  <strong className={result.paymentStatus === "paid" ? styles.paid : ""}>
                    {result.paymentStatus === "paid" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Paid
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    ) : (
                      result.paymentStatus
                    )}
                  </strong>
                </div>
              </div>

              {/* Courier & Tracking Card */}
              {result.awbCode && (
                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginTop: 18,
                  marginBottom: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <div>
                      <span style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#166534", fontWeight: 700 }}>
                        {result.courierName
                          ? result.courierName
                              .replace(/(?:^|[\s\(\[\{—\-])\d+(\.\d+)?\s*(kg|kgs|gm|gms|g)\b[\)\]\}]?/gi, "")
                              .replace(/\s*-\s*$/, "")
                              .replace(/\s{2,}/g, " ")
                              .trim() || result.courierName
                          : "Courier Partner"}{" "}
                        Tracking
                      </span>
                      <strong style={{ fontSize: 16, color: "#14532d", letterSpacing: 0.5, fontFamily: "monospace" }}>
                        {result.awbCode}
                      </strong>
                    </div>
                    {result.trackingUrl && (
                      <a
                        href={result.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-dark"
                        style={{ padding: "6px 14px", fontSize: 12, borderRadius: 6 }}
                      >
                        Track Live on Partner →
                      </a>
                    )}
                  </div>
                  {result.tracking?.currentStatus && (
                    <div style={{ fontSize: 13, color: "#15803d", borderTop: "1px dashed #bbf7d0", paddingTop: 8 }}>
                      <strong>Latest Status:</strong> {result.tracking.currentStatus}
                      {result.tracking.estimatedDeliveryDate && (
                        <span> · Expected by: <strong>{result.tracking.estimatedDeliveryDate}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {result.orderStatus === "cancelled" ? (
                <div className={styles.cancelledBanner}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  This order has been cancelled.
                </div>
              ) : (
                <div className={styles.timeline}>
                  <div className={["placed","packed","dispatched","delivered"].includes(result.orderStatus) ? styles.active : ""}>
                    <span>Order placed</span>
                  </div>
                  <div className={["packed","dispatched","delivered"].includes(result.orderStatus) ? styles.active : ""}>
                    <span>Packed</span>
                  </div>
                  <div className={["dispatched","delivered"].includes(result.orderStatus) ? styles.active : ""}>
                    <span>Dispatched</span>
                  </div>
                  <div className={result.orderStatus === "delivered" ? styles.active : ""}>
                    <span>Delivered</span>
                  </div>
                </div>
              )}

              {/* Recent tracking activities if available */}
              {result.tracking?.activities && result.tracking.activities.length > 0 && (
                <div style={{ marginTop: 20, textAlign: "left" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", fontWeight: 700 }}>
                    Transit Milestones
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.tracking.activities.slice(0, 4).map((act, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, borderLeft: "2px solid var(--terracotta)", paddingLeft: 10 }}>
                        <span style={{ color: "#6b7280", minWidth: 80, fontSize: 11 }}>{act.date.split(" ")[0]}</span>
                        <div>
                          <strong style={{ color: "var(--ink)" }}>{act.activity}</strong>
                          {act.location && <span style={{ color: "#6b7280" }}> ({act.location})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className={styles.helpText}>
                Need help with this order? Contact us with your order number.
              </p>
              {result.orderStatus === "delivered" && result.paymentStatus === "paid" && (
                <GuestReviewForm orderNumber={result.orderNumber} phone={phone} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

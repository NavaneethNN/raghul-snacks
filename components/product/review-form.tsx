"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessionAccount = { id: number; name: string; email: string } | null;
type Order = { id: number; orderNumber: string; createdAt: string };

export function ReviewForm({ productId }: { productId: number }) {
  const [account, setAccount] = useState<SessionAccount>(undefined as any);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [content, setContent] = useState("");
  const [orderId, setOrderId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Fetch session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { account?: SessionAccount }) => setAccount(d.account ?? null))
      .catch(() => setAccount(null));
  }, []);

  // Fetch qualifying orders once logged in
  useEffect(() => {
    if (!account) return;
    setLoadingOrders(true);
    fetch("/api/orders/mine")
      .then((r) => r.json())
      .then((d: { orders?: Array<{ id: number; orderNumber: string; paymentStatus: string; createdAt: string }> }) => {
        const paid = (d.orders ?? []).filter((o) => o.paymentStatus === "paid");
        setOrders(paid.map((o) => ({ id: o.id, orderNumber: o.orderNumber, createdAt: o.createdAt })));
        if (paid.length === 1) setOrderId(paid[0].id);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rating) { setError("Please select a star rating."); return; }
    if (!content.trim()) { setError("Please write a review."); return; }
    if (!orderId) { setError("Please select an order."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, orderId: Number(orderId), rating, content: content.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  // Still loading session
  if (account === undefined) return null;

  return (
    <section style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px 48px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 16, letterSpacing: "-0.03em" }}>
        Write a Review
      </h2>

      {/* Not logged in */}
      {account === null && (
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          <Link href="/login" style={{ color: "var(--terracotta)", fontWeight: 600 }}>Log in</Link> to leave a review.
        </p>
      )}

      {/* Logged in, fetching orders */}
      {account !== null && loadingOrders && (
        <p style={{ fontSize: 14, color: "#6b7280" }}>Checking your orders…</p>
      )}

      {/* Logged in, no qualifying orders */}
      {account !== null && !loadingOrders && orders.length === 0 && (
        <p style={{ fontSize: 14, color: "#6b7280" }}>Purchase this product to leave a review.</p>
      )}

      {/* Thank you message after submission */}
      {submitted && (
        <div style={{ padding: "14px 18px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 14, color: "#166534" }}>
          Thank you! Your review is pending approval.
        </div>
      )}

      {/* Review form */}
      {account !== null && !loadingOrders && orders.length > 0 && !submitted && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Star selector */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: "0 0 8px" }}>Rating</p>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", fontSize: 28, color: star <= (hovered || rating) ? "#e5a52f" : "#d1d5db", lineHeight: 1, transition: "color 0.1s" }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Order selector (only shown when multiple orders) */}
          {orders.length > 1 && (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", display: "block", marginBottom: 6 }}>
                Order
              </label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(Number(e.target.value))}
                required
                style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)" }}
              >
                <option value="">Select an order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Review text */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", display: "block", marginBottom: 6 }}>
              Your review
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              placeholder="Share your experience with this product…"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="button button-dark"
            style={{ alignSelf: "flex-start" }}
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      )}
    </section>
  );
}

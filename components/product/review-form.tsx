"use client";

import { useEffect, useState } from "react";

type SessionAccount = { id: number; name: string; email: string } | null;

export function ReviewForm({ productId }: { productId: number }) {
  const [account, setAccount] = useState<SessionAccount>(undefined as any);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { account?: SessionAccount }) => setAccount(d.account ?? null))
      .catch(() => setAccount(null));
  }, []);

  useEffect(() => {
    if (!account) return;
    // Check both: have they reviewed it, AND have they purchased it
    Promise.all([
      fetch("/api/reviews/mine").then(r => r.json()) as Promise<{ reviewedProductIds: number[] }>,
      fetch("/api/orders/mine").then(r => r.json()) as Promise<{ orders?: Array<{ paymentStatus: string; orderStatus: string; items?: Array<{ productId: number | null }> }> }>,
    ])
      .then(([reviewData, ordersData]) => {
        if (reviewData.reviewedProductIds.includes(productId)) {
          setAlreadyReviewed(true);
          setEligible(false);
          return;
        }
        // Check if this product was purchased in any paid delivered order
        const purchased = (ordersData.orders ?? []).some(order =>
          order.paymentStatus === "paid" &&
          (order.items ?? []).some(item => item.productId === productId)
        );
        setEligible(purchased);
      })
      .catch(() => setEligible(false));
  }, [account, productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!rating) { setError("Please select a star rating."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, content: content.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");
      setSubmitted(true);
      window.dispatchEvent(new Event("review-submitted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  // Don't render anything until session is loaded
  if (account === undefined) return null;
  // Not logged in — hide entirely
  if (account === null) return null;
  // Already reviewed or not eligible — hide entirely
  if (alreadyReviewed || eligible === false) return null;
  // Still checking eligibility
  if (eligible === null) return null;
  // After successful submission — hide form
  if (submitted) return null;

  return (
    <section id="write-review" style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px 48px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 16, letterSpacing: "-0.03em" }}>
        Write a Review
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: "0 0 8px" }}>Rating *</p>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" aria-label={`${star} star`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", fontSize: 32, color: star <= (hovered || rating) ? "#e5a52f" : "#d1d5db", lineHeight: 1, transition: "color 0.1s" }}>
                ★
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", display: "block", marginBottom: 6 }}>
            Your Review <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
          </label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
            placeholder="Share your experience…"
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>
        {error && <p style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>{error}</p>}
        <button type="submit" disabled={submitting} className="button button-dark" style={{ alignSelf: "flex-start" }}>
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </form>
    </section>
  );
}

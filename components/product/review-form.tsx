"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

  // Fetch session
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { account?: SessionAccount }) => setAccount(d.account ?? null))
      .catch(() => setAccount(null));
  }, []);

  // Check eligibility once logged in
  useEffect(() => {
    if (!account) return;
    // Check if already reviewed this product
    fetch("/api/reviews/mine")
      .then((r) => r.json())
      .then((d: { reviewedProductIds: number[] }) => {
        if (d.reviewedProductIds.includes(productId)) {
          setAlreadyReviewed(true);
          setEligible(false);
        } else {
          setEligible(true);
        }
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  // Still loading session — don't render anything yet
  if (account === undefined) return null;

  // Not logged in — don't show the form or any prompt, reviews are shown by ProductReviews above
  if (account === null) return null;

  return (
    <section id="write-review" style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px 48px" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 16, letterSpacing: "-0.03em" }}>
        Write a Review
      </h2>

      {/* Already reviewed */}
      {account !== null && alreadyReviewed && (
        <p style={{ fontSize: 14, color: "#6b7280" }}>You have already reviewed this product. Thank you!</p>
      )}

      {/* Not eligible (no purchase) */}
      {account !== null && eligible === false && !alreadyReviewed && (
        <p style={{ fontSize: 14, color: "#6b7280" }}>Purchase this product to leave a review.</p>
      )}

      {/* Thank you message after submission */}
      {submitted && (
        <div style={{ padding: "14px 18px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, fontSize: 14, color: "#166534" }}>
          ✓ Thank you! Your review has been posted.
        </div>
      )}

      {/* Review form */}
      {account !== null && eligible === true && !submitted && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>

          {/* Star selector */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", margin: "0 0 8px" }}>Rating *</p>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{ background: "none", border: "none", padding: "2px", cursor: "pointer", fontSize: 32, color: star <= (hovered || rating) ? "#e5a52f" : "#d1d5db", lineHeight: 1, transition: "color 0.1s" }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#6b7280", display: "block", marginBottom: 6 }}>
              Your Review <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Share your experience…"
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 14, background: "var(--paper)", color: "var(--ink)", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: "#dc2626" }}>{error}</p>}

          <button type="submit" disabled={submitting} className="button button-dark" style={{ alignSelf: "flex-start" }}>
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      )}
    </section>
  );
}

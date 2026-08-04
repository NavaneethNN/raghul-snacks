"use client";

import { useEffect, useState } from "react";

type Review = {
  id: number;
  customerName: string;
  rating: number;
  content: string;
  createdAt: string | null;
};

type ReviewsData = {
  reviews: Review[];
  canReview: boolean;
  alreadyReviewed: boolean;
  existingRating: number;
  accountName: string;
};

function Stars({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => interactive && onRate?.(n)}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{
            background: "none", border: "none", padding: "0 1px",
            cursor: interactive ? "pointer" : "default",
            fontSize: interactive ? 28 : 18,
            color: n <= (hover || rating) ? "#e5a52f" : "#ddd",
            lineHeight: 1,
          }}
          aria-label={interactive ? `Rate ${n} star${n > 1 ? "s" : ""}` : undefined}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d: ReviewsData) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setSubmitError("Please select a star rating."); return; }
    if (content.trim().length < 1) { setSubmitError("Review cannot be empty."); return; }
    setSubmitting(true); setSubmitError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, content }),
      });
      const json = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to submit review.");
      // Just mark as reviewed — no pending message shown to the user
      setData((prev) => prev ? { ...prev, canReview: false, alreadyReviewed: true } : prev);
      setRating(0);
      setContent("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally { setSubmitting(false); }
  }

  if (loading) return null;
  if (!data) return null;

  const avg = data.reviews.length
    ? Math.round(data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length * 10) / 10
    : 0;

  return (
    <section style={{ maxWidth: 820, margin: "48px auto 0", padding: "0 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28, borderBottom: "1px solid var(--line)", paddingBottom: 16 }}>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, letterSpacing: "-0.03em" }}>
          Customer Reviews
        </h2>
        {data.reviews.length > 0 && (
          <span style={{ color: "#687267", fontSize: 14 }}>
            {avg} / 5 · {data.reviews.length} review{data.reviews.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Write a review */}
      {data.canReview && (
        <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 10, padding: "24px 20px", marginBottom: 32 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>
            Share your experience
          </p>
          <h3 style={{ margin: "0 0 20px", fontFamily: "'Playfair Display',serif", fontSize: 20 }}>Write a Review</h3>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>Your rating</label>
              <Stars rating={rating} interactive onRate={setRating} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--ink)" }}>Your review</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What did you think of this product?"
                rows={4}
                style={{ width: "100%", padding: "12px 14px", border: "1.5px solid var(--line)", borderRadius: 6, font: "15px 'DM Sans', sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => e.currentTarget.style.borderColor = "var(--terracotta)"}
                onBlur={(e) => e.currentTarget.style.borderColor = "var(--line)"}
              />
            </div>
            {submitError && (
              <p style={{ margin: 0, color: "#991b1b", fontSize: 13, background: "#fee2e2", padding: "10px 14px", borderRadius: 6 }}>{submitError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{ alignSelf: "flex-start", background: "var(--ink)", color: "#fff", border: "none", borderRadius: 8, padding: "11px 24px", font: "600 14px 'DM Sans',sans-serif", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        </div>
      )}

      {data.alreadyReviewed && (
        <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, padding: "14px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--terracotta)" }}>Your review</p>
            <Stars rating={data.existingRating} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#687267" }}>Your review is pending approval and will appear here once approved.</p>
        </div>
      )}

      {/* Reviews list */}
      {data.reviews.length === 0 ? (
        <p style={{ color: "#687267", fontSize: 15, fontStyle: "italic" }}>No reviews yet. Be the first to share your thoughts!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {data.reviews.map((r) => (
            <div key={r.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <strong style={{ fontSize: 15 }}>{r.customerName}</strong>
                  <Stars rating={r.rating} />
                </div>
                {r.createdAt && (
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#374151" }}>{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

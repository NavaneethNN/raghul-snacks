"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Review = {
  id: number;
  customerName: string;
  rating: number;
  content: string;
  createdAt: string | null;
};

type MyReview = {
  id: number;
  orderId: number | null;
  rating: number;
  content: string;
};

const PAGE_SIZE = 3;

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: "#e5a52f", fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "#ddd" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

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
          style={{ background: "none", border: "none", fontSize: 36, cursor: "pointer", color: n <= (hover || value) ? "#e5a52f" : "#ddd", padding: "0 2px", lineHeight: 1 }}
          aria-label={`${n} star`}
        >★</button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const searchParams = useSearchParams();
  const sectionRef = useRef<HTMLElement>(null);

  const writeReviewParam = searchParams.get("writeReview") === "1";
  const orderIdParam = Number(searchParams.get("orderId")) || null;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // User's own existing review (for edit)
  const [myReview, setMyReview] = useState<MyReview | null>(null);
  const [myReviewLoaded, setMyReviewLoaded] = useState(false);

  const [shown, setShown] = useState(PAGE_SIZE);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Load published reviews
  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d: { reviews: Review[] }) => setReviews(d.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  // Load user's own review (for edit pre-fill)
  useEffect(() => {
    fetch(`/api/reviews/mine?productId=${productId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { review: MyReview | null }) => setMyReview(d.review ?? null))
      .catch(() => {})
      .finally(() => setMyReviewLoaded(true));
  }, [productId]);

  // Open form when arriving from order modal
  useEffect(() => {
    if (!writeReviewParam || !orderIdParam || !myReviewLoaded) return;
    if (myReview) {
      // Already has a review — open edit form pre-filled
      openEditForm(myReview);
    } else {
      setIsEditing(false);
      setRating(0);
      setContent("");
      setFormOpen(true);
    }
    const t = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeReviewParam, orderIdParam, myReviewLoaded]);

  function openEditForm(review: MyReview) {
    setIsEditing(true);
    setRating(review.rating);
    setContent(review.content);
    setSubmitError("");
    setSubmitted(false);
    setFormOpen(true);
  }

  function openWriteForm() {
    setIsEditing(false);
    setRating(0);
    setContent("");
    setSubmitError("");
    setSubmitted(false);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setSubmitError("Please choose a star rating."); return; }
    if (!content.trim()) { setSubmitError("Please write something about the product."); return; }

    const effectiveOrderId = isEditing ? myReview?.orderId : orderIdParam;
    if (!effectiveOrderId) {
      setSubmitError("Order information missing. Please try again from your orders page.");
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, orderId: effectiveOrderId, rating, content }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to submit review.");
      setSubmitted(true);
      setFormOpen(false);
      // Update local myReview state so UI reflects the change
      setMyReview((prev) => prev ? { ...prev, rating, content } : { id: 0, orderId: effectiveOrderId, rating, content });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (reviews.length === 0 && !writeReviewParam && !myReviewLoaded) return null;
  if (reviews.length === 0 && !writeReviewParam && myReviewLoaded && !myReview) return null;

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  const visible = reviews.slice(0, shown);
  const hasMore = shown < reviews.length;

  return (
    <section ref={sectionRef} id="reviews" style={{ maxWidth: 820, margin: "48px auto 0", padding: "0 20px 48px", scrollMarginTop: 80 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 24, borderBottom: "1px solid var(--line)", paddingBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24, letterSpacing: "-0.03em" }}>
            Customer Reviews
          </h2>
          {avg !== null && (
            <span style={{ color: "#9ca3af", fontSize: 13 }}>
              {avg} / 5 · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {/* Show Write button only if user has no review yet and arrived via order link */}
        {writeReviewParam && !myReview && !submitted && (
          <button
            onClick={() => formOpen ? setFormOpen(false) : openWriteForm()}
            style={{ background: "none", border: "1.5px solid var(--terracotta)", color: "var(--terracotta)", borderRadius: 8, padding: "7px 18px", font: "600 13px 'DM Sans',sans-serif", cursor: "pointer" }}
          >
            {formOpen ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* ── Submitted confirmation ── */}
      {submitted && (
        <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 18px", marginBottom: 24, fontSize: 14, color: "#166534", fontWeight: 500 }}>
          {isEditing ? "Your review has been updated and is pending approval." : "Thanks for your review! It will appear here once approved."}
        </div>
      )}

      {/* ── Write / Edit form ── */}
      {formOpen && !submitted && (
        <form
          onSubmit={handleSubmit}
          style={{ background: "var(--cream)", border: "1.5px solid var(--terracotta)", borderRadius: 10, padding: "20px 20px 22px", marginBottom: 28 }}
        >
          <p style={{ margin: "0 0 16px", fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>
            {isEditing ? "Edit Your Review" : "Your Review"}
          </p>

          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Rating</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div style={{ marginBottom: 18 }}>
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

          {submitError && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#dc2626" }}>{submitError}</p>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{ flex: 1, background: "var(--terracotta)", color: "#fff", border: "none", borderRadius: 8, padding: "13px", font: "600 14px 'DM Sans',sans-serif", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Saving…" : isEditing ? "Update Review" : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              style={{ background: "none", border: "1.5px solid var(--line)", borderRadius: 8, padding: "13px 20px", font: "600 14px 'DM Sans',sans-serif", cursor: "pointer", color: "var(--ink)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Review list ── */}
      {reviews.length > 0 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {visible.map((r) => {
              const isOwn = myReview && myReview.rating === r.rating && myReview.content === r.content;
              return (
                <div key={r.id} style={{ background: "var(--paper)", border: `1px solid ${isOwn ? "var(--terracotta)" : "var(--line)"}`, borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <strong style={{ fontSize: 14 }}>{r.customerName}</strong>
                      <Stars rating={r.rating} />
                      {isOwn && (
                        <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--terracotta)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Your review
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {r.createdAt && (
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                      {isOwn && myReview && (
                        <button
                          onClick={() => openEditForm(myReview)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--terracotta)", fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#374151" }}>{r.content}</p>
                </div>
              );
            })}
          </div>

          {reviews.length > PAGE_SIZE && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button
                onClick={() => setShown((prev) => hasMore ? Math.min(prev + PAGE_SIZE, reviews.length) : PAGE_SIZE)}
                style={{ background: "none", border: "1.5px solid var(--line)", borderRadius: 8, padding: "9px 24px", font: "600 13px 'DM Sans', sans-serif", color: "var(--ink)", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; e.currentTarget.style.color = "var(--terracotta)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}
              >
                {hasMore ? `Show more (${reviews.length - shown} more)` : "Show less"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {reviews.length === 0 && writeReviewParam && !submitted && (
        <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>No reviews yet. Be the first to share your experience!</p>
      )}

    </section>
  );
}

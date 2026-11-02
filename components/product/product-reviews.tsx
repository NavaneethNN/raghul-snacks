"use client";

import { useEffect, useState } from "react";

type Review = {
  id: number;
  customerName: string;
  rating: number;
  content: string;
  verifiedPurchase?: boolean;
  createdAt: string | null;
};

const PAGE_SIZE = 5;

// Clean SVG star component (zero emojis)
function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#e5a52f" : "#e5e7eb"}
      stroke={filled ? "#e5a52f" : "#d1d5db"}
      strokeWidth="1.5"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarRating({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= rating} size={size} />
      ))}
    </span>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Review Form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasSubmittedThisSession, setHasSubmittedThisSession] = useState(false);

  // Fetch reviews
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(`reviewed-prod-${productId}`)) {
      setHasSubmittedThisSession(true);
    }

    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d: { reviews: Review[] }) => {
        setReviews(Array.isArray(d.reviews) ? d.reviews : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Check auth session
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { account?: { name?: string } }) => {
        if (d.account) {
          setIsLoggedIn(true);
          if (d.account.name) setCustomerName(d.account.name);
        }
      })
      .catch(() => {});
  }, [productId]);

  // If page loads with #reviews or writeReview parameter, open form or scroll smoothly
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash === "#reviews" || hash === "#write-review" || search.includes("writeReview=1")) {
        if (!localStorage.getItem(`reviewed-prod-${productId}`)) {
          setShowForm(true);
        }
        const el = document.getElementById("reviews");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
  }, [productId]);

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!rating || rating < 1) {
      setFormError("Please select a star rating.");
      return;
    }
    if (!customerName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!content.trim()) {
      setFormError("Please write a few words about your experience.");
      return;
    }

    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const orderIdParam = urlParams?.get("orderId");

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          content: content.trim(),
          customerName: customerName.trim(),
          orderId: orderIdParam ? parseInt(orderIdParam, 10) : undefined,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        review?: Review;
      };

      if (!res.ok) throw new Error(data.error || "Unable to submit review.");

      if (data.review) {
        setReviews((prev) => [data.review!, ...prev]);
      } else {
        // Fallback optimistic insertion
        const optimistic: Review = {
          id: Date.now(),
          customerName: customerName.trim(),
          rating,
          content: content.trim(),
          verifiedPurchase: isLoggedIn,
          createdAt: new Date().toISOString(),
        };
        setReviews((prev) => [optimistic, ...prev]);
      }

      setFormSuccess(true);
      setHasSubmittedThisSession(true);
      setContent("");

      // Permanently mark review as posted so review popup never appears again
      try {
        localStorage.setItem("review-posted", "true");
        localStorage.setItem(`reviewed-prod-${productId}`, "true");
        localStorage.setItem("delivery-nudge-dismissed", "true");
        sessionStorage.setItem("delivery-nudge-dismissed", "true");
        localStorage.setItem("delivery-notification-dismissed-permanently", "true");
        if (orderIdParam) {
          localStorage.setItem(`reviewed-order-${orderIdParam}`, "true");
        }
      } catch {}
      window.dispatchEvent(new Event("review-submitted"));
      window.dispatchEvent(new CustomEvent("product-reviewed", { detail: { productId } }));

      setTimeout(() => {
        setShowForm(false);
        setFormSuccess(false);
      }, 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const avg =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
  const visible = reviews.slice(0, shown);
  const hasMore = shown < reviews.length;

  return (
    <section id="reviews" style={{ maxWidth: 840, margin: "48px auto 0", padding: "0 20px 48px", boxSizing: "border-box" }}>
      {/* Reviews Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--line)",
          paddingBottom: 16,
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 6px",
              fontFamily: "'Playfair Display', serif",
              fontSize: 26,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Customer Reviews
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {reviews.length > 0 ? (
              <>
                <StarRating rating={Math.round(avg)} size={16} />
                <strong style={{ fontSize: 15, color: "var(--ink)" }}>{avg}</strong>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: "#6b7280" }}>
                No reviews yet
              </span>
            )}
          </div>
        </div>

        {hasSubmittedThisSession ? (
          <span style={{ fontSize: 13, color: "#166534", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 14px", borderRadius: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Review Submitted
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setFormSuccess(false);
            }}
            className="button button-dark"
            style={{ padding: "9px 18px", fontSize: 13 }}
          >
            {showForm ? "Cancel" : "Write a Review"}
          </button>
        )}
      </div>

      {/* Review Submission Form */}
      {showForm && (
        <div
          style={{
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "24px",
            marginBottom: 28,
            boxShadow: "0 4px 14px rgba(36, 49, 39, 0.04)",
          }}
        >
          {formSuccess ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                padding: "14px 18px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Thank you! Your review has been submitted.
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontFamily: "'Playfair Display', serif",
                  color: "var(--ink)",
                }}
              >
                Share your thoughts
              </h3>

              {/* Star Rating Picker */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4b5563", marginBottom: 6 }}>
                  Rating *
                </label>
                <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoveredRating || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                          display: "inline-flex",
                        }}
                        aria-label={`${star} star`}
                      >
                        <StarIcon filled={active} size={28} />
                      </button>
                    );
                  })}
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginLeft: 8 }}>
                    {hoveredRating || rating} / 5 stars
                  </span>
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4b5563", marginBottom: 6 }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priyadharshini K."
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid var(--line)",
                    background: "var(--cream)",
                    fontSize: 14,
                    color: "var(--ink)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Review Text */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#4b5563", marginBottom: 6 }}>
                  Review *
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="How was the crunch, flavor, and packaging? Would you recommend it?"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid var(--line)",
                    background: "var(--cream)",
                    fontSize: 14,
                    color: "var(--ink)",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {formError && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="button button-dark"
                  style={{ padding: "10px 22px" }}
                >
                  {submitting ? "Submitting…" : "Post Review"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="button button-outline"
                  style={{ padding: "10px 16px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#6b7280", padding: "30px 0" }}>
          Loading reviews…
        </p>
      ) : reviews.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 12,
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 15, color: "#6b7280" }}>
            No reviews yet. Be the first to share your experience with this snack!
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="button button-dark"
            style={{ padding: "8px 18px", fontSize: 13 }}
          >
            Leave First Review
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {visible.map((r) => (
            <div
              key={r.id}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "16px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14, color: "var(--ink)" }}>{r.customerName}</strong>
                  <StarRating rating={r.rating} size={14} />
                </div>
                {r.createdAt && (
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#374151" }}>
                {r.content}
              </p>
            </div>
          ))}

          {/* Show more button */}
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShown((prev) => Math.min(prev + PAGE_SIZE, reviews.length))}
                className="button button-outline"
                style={{ padding: "8px 20px", fontSize: 13 }}
              >
                Load More Reviews ({reviews.length - shown} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

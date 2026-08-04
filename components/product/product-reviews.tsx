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

const PAGE_SIZE = 3;

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "#e5a52f", fontSize: 16, letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "#ddd" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ProductReviews({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch(`/api/reviews?productId=${productId}`)
      .then((r) => r.json())
      .then((d: ReviewsData) => setReviews(d.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || reviews.length === 0) return null;

  const avg = Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10;
  const visible = reviews.slice(0, shown);
  const hasMore = shown < reviews.length;
  const isAll = shown >= reviews.length;

  return (
    <section style={{ maxWidth: 820, margin: "48px auto 0", padding: "0 20px 48px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 24, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24, letterSpacing: "-0.03em" }}>
          Customer Reviews
        </h2>
        <span style={{ color: "#9ca3af", fontSize: 13 }}>
          {avg} / 5 · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Review list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {visible.map((r) => (
          <div key={r.id} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <strong style={{ fontSize: 14 }}>{r.customerName}</strong>
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

      {/* Show more / Show less */}
      {reviews.length > PAGE_SIZE && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => {
              if (hasMore) {
                setShown((prev) => Math.min(prev + PAGE_SIZE, reviews.length));
              } else {
                setShown(PAGE_SIZE);
              }
            }}
            style={{
              background: "none",
              border: "1.5px solid var(--line)",
              borderRadius: 8,
              padding: "9px 24px",
              font: "600 13px 'DM Sans', sans-serif",
              color: "var(--ink)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; e.currentTarget.style.color = "var(--terracotta)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}
          >
            {isAll ? "Show less" : `Show more (${reviews.length - shown} more)`}
          </button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

type Review = {
  id: number;
  customerName: string;
  rating: number;
  content: string;
  createdAt: string | null;
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

/** Renders 5 SVG stars with partial fill based on a decimal rating (e.g. 4.3) */
function AggregateStars({ rating }: { rating: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.min(1, Math.max(0, rating - (n - 1)));
        const id = `star-grad-${n}-${Math.round(rating * 10)}`;
        return (
          <svg key={n} width="18" height="18" viewBox="0 0 24 24" style={{ display: "block" }}>
            <defs>
              <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${fill * 100}%`} stopColor="#e5a52f" />
                <stop offset={`${fill * 100}%`} stopColor="#e0e0e0" />
              </linearGradient>
            </defs>
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={`url(#${id})`}
              stroke="#e5a52f"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
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
      .then((d: { reviews: Review[] }) => setReviews(d.reviews ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading || reviews.length === 0) return null;

  const avg = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
  const visible = reviews.slice(0, shown);
  const hasMore = shown < reviews.length;

  return (
    <section id="reviews" style={{ maxWidth: 820, margin: "48px auto 0", padding: "0 20px 48px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, borderBottom: "1px solid var(--line)", paddingBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 24, letterSpacing: "-0.03em" }}>
          Customer Reviews
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AggregateStars rating={avg} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{avg}</span>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>· {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
        </div>
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

      {/* Show more / less */}
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

    </section>
  );
}

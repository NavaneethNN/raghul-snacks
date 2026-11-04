"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AdminHeaderActions } from "./admin-header-actions";
import { ConfirmDialog } from "./admin-confirm-dialog";

type Review = {
  id: number;
  customerName: string;
  rating: number;
  content: string;
  approved: boolean;
  createdAt: string | null;
  productId: number | null;
  productName: string | null;
};

function StarIcons({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= rating ? "#f59e0b" : "#e5e7eb"}
          stroke={i <= rating ? "#f59e0b" : "#d1d5db"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "visible" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(Array.isArray(d) ? d : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggleVisibility(id: number, currentApproved: boolean) {
    setBusy(id);
    const newStatus = !currentApproved;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: newStatus }),
      });
      if (res.ok) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, approved: newStatus } : r)));
        setMessage(newStatus ? "Review is now visible on product page." : "Review has been hidden from store.");
      } else {
        setMessage("Failed to update review status.");
      }
    } catch {
      setMessage("Failed to update review status.");
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(""), 3500);
    }
  }

  async function deleteReview(id: number) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        setMessage("Review permanently deleted.");
      } else {
        setMessage("Failed to delete review.");
      }
    } catch {
      setMessage("Failed to delete review.");
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(""), 3500);
    }
  }

  function handleCopyFeedbackLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://raghuldelights.in";
    const url = `${origin}/feedback`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
  }

  const visibleCount = reviews.filter((r) => r.approved).length;
  const hiddenCount = reviews.filter((r) => !r.approved).length;

  const avgRating = useMemo(() => {
    if (!reviews.length) return "0.0";
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (filter === "visible" && !r.approved) return false;
      if (filter === "hidden" && r.approved) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = r.customerName?.toLowerCase().includes(q);
        const prodMatch = r.productName?.toLowerCase().includes(q);
        const contentMatch = r.content?.toLowerCase().includes(q);
        return nameMatch || prodMatch || contentMatch;
      }
      return true;
    });
  }, [reviews, filter, search]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #f7f4ec)", paddingBottom: 60 }}>
      {/* ── Top Header ── */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e0d8",
          padding: "24px 20px",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 1px 4px rgba(36, 49, 39, 0.03)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta, #c95f3b)", fontFamily: "var(--font-dm-mono, monospace)" }}>
                Social Proof & Ratings
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: "clamp(22px, 3.5vw, 28px)", fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              Customer Reviews
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78716c" }}>
              Reviews are live on your product pages automatically. You can hide or delete any review anytime.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Copy Review Form Link Button */}
            <button
              type="button"
              onClick={handleCopyFeedbackLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 16px",
                background: copiedLink ? "#f0fdf4" : "var(--terracotta, #c95f3b)",
                color: copiedLink ? "#166534" : "#ffffff",
                border: copiedLink ? "1.5px solid #86efac" : "none",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: copiedLink ? "none" : "0 3px 10px rgba(201, 95, 59, 0.25)",
                transition: "all 0.2s ease",
              }}
              title="Copy link to send to customers via WhatsApp or SMS"
            >
              {copiedLink ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.6"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>✓ Form Link Copied!</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                  <span>Copy Review Form Link</span>
                </>
              )}
            </button>

            <Link
              href="/feedback"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "9px 14px",
                background: "#ffffff",
                border: "1.5px solid #e5e0d8",
                color: "#57534e",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
              title="Preview the standalone feedback form in a new tab"
            >
              <span>Preview Form</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </Link>

            <AdminHeaderActions />
          </div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main style={{ maxWidth: 1200, margin: "24px auto 0", padding: "0 16px", boxSizing: "border-box" }}>

        {/* ── Status Message Toast ── */}
        {message && (
          <div
            style={{
              padding: "12px 18px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 10,
              color: "#166534",
              fontSize: 13.5,
              fontWeight: 600,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{message}</span>
          </div>
        )}

        {/* ── Stats Summary Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e5e0d8", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#78716c", fontFamily: "var(--font-dm-mono, monospace)" }}>
              Total Reviews
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)", marginTop: 4 }}>
              {reviews.length}
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e0d8", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#166534", fontFamily: "var(--font-dm-mono, monospace)" }}>
              Live on Store
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#166534", fontFamily: "var(--font-playfair, Georgia, serif)", marginTop: 4 }}>
              {visibleCount}
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e0d8", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#92400e", fontFamily: "var(--font-dm-mono, monospace)" }}>
              Hidden Reviews
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#92400e", fontFamily: "var(--font-playfair, Georgia, serif)", marginTop: 4 }}>
              {hiddenCount}
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e0d8", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#b45309", fontFamily: "var(--font-dm-mono, monospace)" }}>
              Average Rating
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
                {avgRating}
              </span>
              <StarIcons rating={Math.round(Number(avgRating))} size={14} />
            </div>
          </div>
        </div>

        {/* ── Toolbar: Filter Tabs & Search ── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e0d8",
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {/* Filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setFilter("all")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: "1.5px solid",
                borderColor: filter === "all" ? "var(--terracotta, #c95f3b)" : "transparent",
                background: filter === "all" ? "var(--terracotta, #c95f3b)" : "#f5f4ef",
                color: filter === "all" ? "#ffffff" : "#57534e",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              All ({reviews.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter("visible")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: "1.5px solid",
                borderColor: filter === "visible" ? "#16a34a" : "transparent",
                background: filter === "visible" ? "#16a34a" : "#f5f4ef",
                color: filter === "visible" ? "#ffffff" : "#57534e",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Live on Store ({visibleCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter("hidden")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: "1.5px solid",
                borderColor: filter === "hidden" ? "#78716c" : "transparent",
                background: filter === "hidden" ? "#78716c" : "#f5f4ef",
                color: filter === "hidden" ? "#ffffff" : "#57534e",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Hidden ({hiddenCount})
            </button>
          </div>

          {/* Search box */}
          <div style={{ position: "relative", minWidth: 220, flex: 1, maxWidth: 320 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer or snack…"
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: 8,
                border: "1px solid #e5e0d8",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2.2"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Reviews Listing (Responsive Cards on Mobile & Clean Table on Desktop) ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: 14, border: "1px solid #e5e0d8" }}>
            <p style={{ margin: 0, color: "#78716c", fontSize: 14 }}>Loading customer reviews…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: 14, border: "1px solid #e5e0d8" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="1.5" style={{ marginBottom: 12 }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "var(--ink, #243127)", fontFamily: "var(--font-playfair, Georgia, serif)" }}>
              No reviews found
            </h3>
            <p style={{ margin: "0 0 16px", color: "#78716c", fontSize: 13.5 }}>
              {search ? "No reviews match your search query." : "Share your feedback form link with customers to start collecting reviews!"}
            </p>
            <button
              type="button"
              onClick={handleCopyFeedbackLink}
              style={{
                padding: "9px 18px",
                background: "var(--terracotta, #c95f3b)",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copiedLink ? "✓ Link Copied!" : "Copy Review Link"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((r) => {
              const dateStr = r.createdAt
                ? new Date(r.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";

              return (
                <div
                  key={r.id}
                  style={{
                    background: "#ffffff",
                    border: `1px solid ${r.approved ? "#e5e0d8" : "#fcd34d"}`,
                    borderRadius: 14,
                    padding: "16px 18px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  {/* Top Bar: Customer Name + Rating + Status Badge */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 15, color: "var(--ink, #243127)" }}>
                          {r.customerName}
                        </strong>
                        <StarIcons rating={r.rating} size={14} />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        {r.productName ? (
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: "var(--terracotta, #c95f3b)",
                              background: "rgba(201, 95, 59, 0.08)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontFamily: "var(--font-dm-mono, monospace)",
                            }}
                          >
                            {r.productName}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: "#78716c" }}>General Store Review</span>
                        )}
                        <span style={{ fontSize: 12, color: "#a8a29e" }}>• {dateStr}</span>
                      </div>
                    </div>

                    {/* Live/Hidden Badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 999,
                          fontFamily: "var(--font-dm-mono, monospace)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background: r.approved ? "#dcfce7" : "#fef3c7",
                          color: r.approved ? "#166534" : "#92400e",
                          border: `1px solid ${r.approved ? "#bbf7d0" : "#fde68a"}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: r.approved ? "#22c55e" : "#f59e0b",
                            display: "inline-block",
                          }}
                        />
                        {r.approved ? "Live on Store" : "Hidden"}
                      </span>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div
                    style={{
                      background: "#faf8f4",
                      border: "1px solid #f0ede8",
                      borderRadius: 10,
                      padding: "12px 14px",
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: "#374151",
                      marginBottom: 12,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    “{r.content}”
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid #f7f4ed" }}>
                    <div style={{ fontSize: 12, color: "#78716c" }}>
                      {r.approved ? (
                        <span>Currently visible to customers on the product page.</span>
                      ) : (
                        <span style={{ color: "#b45309" }}>Hidden — visitors cannot see this review.</span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Hide / Show Toggle Button */}
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => toggleVisibility(r.id, r.approved)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 7,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: r.approved ? "#ffffff" : "#16a34a",
                          color: r.approved ? "#57534e" : "#ffffff",
                          border: r.approved ? "1px solid #e5e0d8" : "none",
                          transition: "all 0.15s ease",
                        }}
                        title={r.approved ? "Hide from product page" : "Show on product page"}
                      >
                        {r.approved ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            <span>Hide</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <span>Unhide (Show)</span>
                          </>
                        )}
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        disabled={busy === r.id}
                        onClick={() => setConfirmDeleteId(r.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 12px",
                          borderRadius: 7,
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "#fff",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          transition: "all 0.15s ease",
                        }}
                        title="Delete this review permanently"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Confirmation Dialog for Delete */}
      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="Are you sure you want to delete this review permanently? This action cannot be undone."
          confirmLabel="Delete Review"
          onConfirm={() => {
            const id = confirmDeleteId;
            setConfirmDeleteId(null);
            deleteReview(id);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

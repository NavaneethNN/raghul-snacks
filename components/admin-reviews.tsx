"use client";

import { useEffect, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

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

const STARS = "★★★★★";

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");

  // Counts
  const pendingCount = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) => r.approved).length;
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { fetchReviews(); }, []);

  async function fetchReviews() {
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) setReviews(await res.json());
    } catch {}
    finally { setLoading(false); }
  }

  async function setApproved(id: number, approved: boolean) {
    setBusy(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved }) });
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, approved } : r));
      setMessage(approved ? "Review approved." : "Review hidden.");
    } catch { setMessage("Failed to update review."); }
    finally { setBusy(null); }
  }

  async function deleteReview(id: number) {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setMessage("Review deleted.");
    } catch { setMessage("Failed to delete review."); }
    finally { setBusy(null); }
  }

  const filtered = reviews.filter((r) =>
    filter === "all" ? true : filter === "approved" ? r.approved : !r.approved
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Review Management</p>
          <h1>Customer Reviews</h1>
          <p>Approve or remove product reviews before they appear on the site.</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde047", borderRadius: 10, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#92400e" }}>{pendingCount} review{pendingCount !== 1 ? "s" : ""} awaiting approval</p>
              <p style={{ margin: 0, fontSize: 13, color: "#a16207" }}>Click Approve to make them visible on the site.</p>
            </div>
          </div>
        )}
        <AdminHeaderActions />
      </header>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>
              All ({reviews.length})
            </button>
            <button className={filter === "pending" ? styles.activeFilter : ""} onClick={() => setFilter("pending")}>
              Pending {pendingCount > 0 && <span style={{ background: "#f59e0b", color: "#fff", borderRadius: "999px", padding: "1px 7px", fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{pendingCount}</span>}
            </button>
            <button className={filter === "approved" ? styles.activeFilter : ""} onClick={() => setFilter("approved")}>
              Approved ({approvedCount})
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: "10px 16px", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 8, color: "#065f46", fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
            {message}
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={styles.emptyState}><div><p>Loading reviews…</p></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <h3>No reviews</h3>
                      <p>{filter === "pending" ? "No pending reviews." : "No reviews yet."}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.customerName}</strong></td>
                    <td>{r.productName ?? "—"}</td>
                    <td><span style={{ color: "#e5a52f", fontSize: 16 }}>{STARS.slice(0, r.rating)}</span><span style={{ color: "#ddd" }}>{STARS.slice(r.rating)}</span></td>
                    <td style={{ maxWidth: 280 }}>{r.content}</td>
                    <td>
                      <span style={{ background: r.approved ? "#d1fae5" : "#fef3c7", color: r.approved ? "#065f46" : "#92400e", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        {r.approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {r.approved ? (
                          <button className={styles.iconButton} title="Hide" disabled={busy === r.id} onClick={() => setApproved(r.id, false)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                          </button>
                        ) : (
                          <button className={styles.iconButton} title="Approve" disabled={busy === r.id} onClick={() => setApproved(r.id, true)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        )}
                        <button className={styles.iconButton} title="Delete" disabled={busy === r.id} onClick={() => deleteReview(r.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

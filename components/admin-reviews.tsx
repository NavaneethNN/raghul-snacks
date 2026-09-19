"use client";

import React from "react";
import { useEffect, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { ConfirmDialog } from "./admin-confirm-dialog";
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
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const pendingCount  = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) =>  r.approved).length;

  useEffect(() => {
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => setReviews(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function setApproved(id: number, approved: boolean) {
    setBusy(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, approved } : r));
      setMessage(approved ? "Review approved." : "Review hidden.");
    } catch {
      setMessage("Failed to update review.");
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  async function deleteReview(id: number) {
    setBusy(id);
    try {
      await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      if (expanded === id) setExpanded(null);
      setMessage("Review deleted.");
    } catch {
      setMessage("Failed to delete review.");
    } finally {
      setBusy(null);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  const filtered = reviews.filter((r) =>
    filter === "all" ? true : filter === "approved" ? r.approved : !r.approved
  );

  function toggle(id: number) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Review Management</p>
          <h1>Customer Reviews</h1>
          <p>Approve or remove product reviews.</p>
        </div>
        <AdminHeaderActions />
        {pendingCount > 0 && (
          <div style={{ background: "#fef3c7", border: "1px solid #fde047", borderRadius: 8, padding: "10px 16px" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#92400e" }}>{pendingCount} pending</p>
          </div>
        )}
      </header>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button className={filter === "all"      ? styles.activeFilter : ""} onClick={() => setFilter("all")}>All ({reviews.length})</button>
            <button className={filter === "pending"  ? styles.activeFilter : ""} onClick={() => setFilter("pending")}>
              Pending {pendingCount > 0 && <span style={{ background: "#f59e0b", color: "#fff", borderRadius: "999px", padding: "1px 6px", fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{pendingCount}</span>}
            </button>
            <button className={filter === "approved" ? styles.activeFilter : ""} onClick={() => setFilter("approved")}>Approved ({approvedCount})</button>
          </div>
        </div>

        {message && (
          <p style={{ margin: 0, padding: "10px 16px", background: "#d1fae5", color: "#065f46", fontSize: 13, fontWeight: 500 }}>{message}</p>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Rating</th>
                <th>Status</th>
                <th className={styles.colHide}>Product</th>
                <th className={styles.colHide} style={{ maxWidth: 260 }}>Review</th>
                <th className={styles.colHide}>Date</th>
                <th>Actions</th>
                {/* chevron for mobile expand */}
                <th className={styles.colHideDesktop} style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={styles.emptyState}><div><p>Loading…</p></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      <h3>No reviews</h3>
                      <p>{filter === "pending" ? "No pending reviews." : "No reviews yet."}</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((r) => {
                const isOpen = expanded === r.id;
                return (
                  <React.Fragment key={r.id}>
                    {/* Main row */}
                    <tr
                      key={`row-${r.id}`}
                      onClick={() => toggle(r.id)}
                      style={{ cursor: "pointer" }}
                      className={isOpen ? styles.rowOpen : ""}
                    >
                      <td><strong>{r.customerName}</strong></td>
                      <td>
                        <span style={{ color: "#e5a52f" }}>{STARS.slice(0, r.rating)}</span>
                        <span style={{ color: "#e5e7eb" }}>{STARS.slice(r.rating)}</span>
                      </td>
                      <td>
                        <span style={{
                          background: r.approved ? "#d1fae5" : "#fef3c7",
                          color: r.approved ? "#065f46" : "#92400e",
                          padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                        }}>
                          {r.approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className={styles.colHide}>{r.productName ?? "—"}</td>
                      <td className={styles.colHide} style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.content}
                      </td>
                      <td className={styles.colHide}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                      <td onClick={(e) => e.stopPropagation()}>
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
                          <button className={styles.iconButton} title="Delete" disabled={busy === r.id} onClick={() => setConfirmDeleteId(r.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        </div>
                      </td>
                      <td className={styles.colHideDesktop} style={{ textAlign: "center", padding: "0 4px" }}>
                        <svg className={`${styles.rowChevron} ${isOpen ? styles.rowChevronUp : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </td>
                    </tr>

                    {/* Detail row — mobile expand only */}
                    {isOpen && (
                      <tr key={`detail-${r.id}`} className={styles.detailRowWrapper}>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div className={styles.rowDetail}>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Product</span>
                              <span className={styles.detailValue}>{r.productName ?? "—"}</span>
                            </div>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Date</span>
                              <span className={styles.detailValue}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span>
                            </div>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Review</span>
                              <span className={styles.detailValue} style={{ lineHeight: 1.6 }}>{r.content}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="Delete this review permanently? This cannot be undone."
          confirmLabel="Delete"
          onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); deleteReview(id); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

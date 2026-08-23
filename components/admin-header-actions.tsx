"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./admin-dashboard.module.css";

type NotifData = {
  newOrders: number;
  unreadMessages: number;
  pendingReviews: number;
};

export function AdminHeaderActions() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifData>({ newOrders: 0, unreadMessages: 0, pendingReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const total = data.newOrders + data.unreadMessages + data.pendingReviews;

  // Only portal after client mount
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/notifications/orders").then((r) => r.json()) as Promise<{ newOrders: number }>,
      fetch("/api/admin/messages").then((r) => r.json()) as Promise<Array<{ read: boolean }>>,
      fetch("/api/admin/reviews").then((r) => r.json()) as Promise<Array<{ approved: boolean }>>,
    ])
      .then(([orders, messages, reviews]) => {
        setData({
          newOrders: orders.newOrders ?? 0,
          unreadMessages: Array.isArray(messages) ? messages.filter((m) => !m.read).length : 0,
          pendingReviews: Array.isArray(reviews) ? reviews.filter((r) => !r.approved).length : 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  async function handleSignOut() {
    try {
      const response = await fetch("/api/admin/auth", { method: "DELETE" });
      if (response.ok) { router.push("/admin/login"); router.refresh(); }
    } catch { /* ignore */ }
  }

  const panel = (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(36,49,39,0.3)",
          zIndex: 10000,
          backdropFilter: "blur(1px)",
          pointerEvents: open ? "auto" : "none",
          opacity: open ? 1 : 0,
          transition: "opacity 0.25s",
        }}
      />

      {/* Slide-in notification panel */}
      <div
        ref={panelRef}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
          background: "var(--paper)",
          borderLeft: "1px solid var(--line)",
          zIndex: 10001,
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.14)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>Admin</p>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Sans',sans-serif" }}>Notifications</h2>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 6, display: "flex" }} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", marginTop: 40 }}>Loading…</p>
          ) : total === 0 ? (
            <div style={{ textAlign: "center", marginTop: 60, color: "#9ca3af" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 14px", display: "block" }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>All caught up!</p>
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>No new notifications.</p>
            </div>
          ) : (
            <>
              {data.newOrders > 0 && (
                <NotifCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>}
                  iconBg="#fef3c7" iconColor="#92400e"
                  count={data.newOrders}
                  title="New Orders"
                  description={`${data.newOrders} paid order${data.newOrders > 1 ? "s" : ""} placed in the last 24 hours.`}
                  href="/admin/orders" actionLabel="View Orders"
                  onClick={() => setOpen(false)}
                />
              )}
              {data.unreadMessages > 0 && (
                <NotifCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  iconBg="#dbeafe" iconColor="#1e40af"
                  count={data.unreadMessages}
                  title="Unread Messages"
                  description={`${data.unreadMessages} contact enquir${data.unreadMessages > 1 ? "ies" : "y"} awaiting reply.`}
                  href="/admin/messages" actionLabel="View Messages"
                  onClick={() => setOpen(false)}
                />
              )}
              {data.pendingReviews > 0 && (
                <NotifCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  iconBg="#f3e8ff" iconColor="#7e22ce"
                  count={data.pendingReviews}
                  title="Pending Reviews"
                  description={`${data.pendingReviews} review${data.pendingReviews > 1 ? "s" : ""} waiting for approval.`}
                  href="/admin/reviews" actionLabel="Approve Reviews"
                  onClick={() => setOpen(false)}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--line)", flexShrink: 0 }}>
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--ink)", color: "#fff", borderRadius: 8, padding: "11px", font: "600 13px 'DM Sans',sans-serif", textDecoration: "none" }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className={styles.headerActions}>
        {/* Notification bell */}
        <button
          className={styles.notificationButton}
          title="Notifications"
          onClick={() => setOpen((p) => !p)}
          style={{ position: "relative" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {!loading && total > 0 && (
            <span style={{
              position: "absolute", top: -6, right: -6,
              background: "var(--terracotta)", color: "#fff",
              borderRadius: "999px", minWidth: 18, height: 18,
              fontSize: 10, fontWeight: 700, fontFamily: "'DM Mono',monospace",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px", lineHeight: 1,
              border: "2px solid var(--paper)",
            }}>
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>

        <button className={styles.signOutButton} onClick={handleSignOut}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>

      {/* Portal to body — bypasses all parent stacking contexts */}
      {mounted && createPortal(panel, document.body)}
    </>
  );
}

/* ── Notification card ── */
function NotifCard({ icon, iconBg, iconColor, count, title, description, href, actionLabel, onClick }: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  count: number;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: iconColor }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <strong style={{ fontSize: 14, color: "var(--ink)" }}>{title}</strong>
            <span style={{ background: "var(--terracotta)", color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
              {count}
            </span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{description}</p>
          <Link
            href={href}
            onClick={onClick}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "var(--terracotta)", textDecoration: "none" }}
          >
            {actionLabel}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

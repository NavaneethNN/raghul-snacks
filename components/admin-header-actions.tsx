"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NotifData = {
  newOrders: number;
  unreadMessages: number;
  pendingReviews: number;
};

/**
 * AdminBell — the notification bell button + slide-in panel.
 * variant="light" (default) — for light page headers (var(--paper) bg)
 * variant="dark"            — for dark top bar (var(--ink) bg)
 */
export function AdminHeaderActions({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotifData>({ newOrders: 0, unreadMessages: 0, pendingReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const total = data.newOrders + data.unreadMessages + data.pendingReviews;

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
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s",
        }}
      />

      {/* Slide-in panel */}
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
        {/* Panel header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--terracotta)" }}>Admin</p>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Sans',sans-serif" }}>Notifications</h2>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 6, display: "flex" }} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Panel body */}
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
                  count={data.newOrders} title="New Orders"
                  description={`${data.newOrders} paid order${data.newOrders > 1 ? "s" : ""} in the last 24 hours.`}
                  href="/admin/orders" actionLabel="View Orders"
                  onClick={() => { setData((p) => ({ ...p, newOrders: 0 })); setOpen(false); }}
                />
              )}
              {data.unreadMessages > 0 && (
                <NotifCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                  iconBg="#dbeafe" iconColor="#1e40af"
                  count={data.unreadMessages} title="Unread Messages"
                  description={`${data.unreadMessages} enquir${data.unreadMessages > 1 ? "ies" : "y"} awaiting reply.`}
                  href="/admin/messages" actionLabel="View Messages"
                  onClick={() => { setData((p) => ({ ...p, unreadMessages: 0 })); setOpen(false); }}
                />
              )}
              {data.pendingReviews > 0 && (
                <NotifCard
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  iconBg="#f3e8ff" iconColor="#7e22ce"
                  count={data.pendingReviews} title="Pending Reviews"
                  description={`${data.pendingReviews} review${data.pendingReviews > 1 ? "s" : ""} waiting for approval.`}
                  href="/admin/reviews" actionLabel="Approve Reviews"
                  onClick={() => { setData((p) => ({ ...p, pendingReviews: 0 })); setOpen(false); }}
                />
              )}
            </>
          )}
        </div>

        {/* Panel footer */}
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

  /* ── Bell button — colors adapt to background ── */
  const isDark = variant === "dark";
  const btnBg        = isDark ? "rgba(201,95,59,0.12)"        : "var(--paper)";
  const btnBorder    = isDark ? "rgba(201,95,59,0.3)"         : "var(--line)";
  const btnColor     = isDark ? "var(--cream)"                : "var(--ink)";
  const btnBgHover   = isDark ? "rgba(201,95,59,0.25)"        : "var(--cream)";
  const btnBdrHover  = isDark ? "var(--terracotta)"           : "var(--terracotta)";
  const btnClrHover  = isDark ? "var(--terracotta)"           : "var(--terracotta)";
  const badgeBorder  = isDark ? "var(--ink)"                  : "var(--paper)";

  return (
    <>
      <button
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((p) => !p)}
        style={{
          position: "relative",
          width: 38, height: 38,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: btnBg,
          border: `1.5px solid ${btnBorder}`,
          borderRadius: 8,
          cursor: "pointer",
          color: btnColor,
          transition: "background 0.2s, border-color 0.2s, color 0.2s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = btnBgHover;
          b.style.borderColor = btnBdrHover;
          b.style.color = btnClrHover;
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.background = btnBg;
          b.style.borderColor = btnBorder;
          b.style.color = btnColor;
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {!loading && total > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5,
            background: "var(--terracotta)", color: "#fff",
            borderRadius: "999px", minWidth: 17, height: 17,
            fontSize: 9, fontWeight: 700, fontFamily: "'DM Mono',monospace",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", lineHeight: 1,
            border: `2px solid ${badgeBorder}`,
          }}>
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {mounted && createPortal(panel, document.body)}
    </>
  );
}

/* ── Notification card ── */
function NotifCard({ icon, iconBg, iconColor, count, title, description, href, actionLabel, onClick }: {
  icon: React.ReactNode;
  iconBg: string; iconColor: string;
  count: number; title: string; description: string;
  href: string; actionLabel: string;
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

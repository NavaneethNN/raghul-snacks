"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type DeliveredOrder = { orderNumber: string };

const DISMISS_DURATION_MS = 3 * 60 * 1000; // 3 minutes
const STORAGE_KEY = "delivery-notification-dismissed-at";

export function DeliveryNotification() {
  const [order, setOrder] = useState<DeliveredOrder | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.account) return;

        const res = await fetch("/api/orders/mine");
        if (!res.ok) return;
        const data = await res.json() as { orders?: Array<{ orderNumber: string; orderStatus: string }> };
        const delivered = data.orders?.find((o) => o.orderStatus === "delivered");
        if (!delivered) return;

        setOrder({ orderNumber: delivered.orderNumber });
        showIfReady(delivered.orderNumber);
      })
      .catch(() => {});

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showIfReady(orderNumber: string) {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dismissedAt = stored ? parseInt(stored, 10) : 0;
    const elapsed = Date.now() - dismissedAt;

    if (elapsed >= DISMISS_DURATION_MS) {
      // Enough time has passed — show immediately
      setVisible(true);
    } else {
      // Schedule to show when the 3-min window expires
      const remaining = DISMISS_DURATION_MS - elapsed;
      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, remaining);
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
    // Schedule re-show after 3 minutes
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, DISMISS_DURATION_MS);
  }

  if (!order || !visible) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      left: "50%",
      transform: "translateX(-50%)",
      background: "var(--ink)",
      color: "#fff",
      borderRadius: 10,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      zIndex: 9999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      maxWidth: "min(480px, calc(100vw - 32px))",
      width: "100%",
      boxSizing: "border-box",
      animation: "slideUpIn 0.35s ease-out",
    }}>
      <style>{`@keyframes slideUpIn { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🎉</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Your order {order.orderNumber} has been delivered!</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#b8c6a7" }}>Enjoyed it? Leave a review on your account page.</p>
      </div>
      <Link
        href="/account"
        onClick={dismiss}
        style={{ background: "var(--terracotta)", color: "#fff", padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Review
      </Link>
      <button
        onClick={dismiss}
        style={{ background: "none", border: "none", color: "#b8c6a7", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

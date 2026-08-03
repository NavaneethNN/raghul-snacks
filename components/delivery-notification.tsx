"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DeliveredOrder = { orderNumber: string };

export function DeliveryNotification() {
  const [order, setOrder] = useState<DeliveredOrder | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only check for logged-in users
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.account) return;

        // Check if they've dismissed this notification already
        const dismissedKey = window.sessionStorage.getItem("delivery-notification-dismissed");

        // Fetch their most recent delivered order
        const res = await fetch("/api/orders/mine");
        if (!res.ok) return;
        const data = await res.json() as { orders?: Array<{ orderNumber: string; orderStatus: string }> };
        const delivered = data.orders?.find((o) => o.orderStatus === "delivered");
        if (!delivered) return;

        if (dismissedKey === delivered.orderNumber) return;
        setOrder({ orderNumber: delivered.orderNumber });
      })
      .catch(() => {});
  }, []);

  if (!order || dismissed) return null;

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
        onClick={() => {
          window.sessionStorage.setItem("delivery-notification-dismissed", order.orderNumber);
          setDismissed(true);
        }}
        style={{ background: "var(--terracotta)", color: "#fff", padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Review
      </Link>
      <button
        onClick={() => {
          window.sessionStorage.setItem("delivery-notification-dismissed", order.orderNumber);
          setDismissed(true);
        }}
        style={{ background: "none", border: "none", color: "#b8c6a7", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

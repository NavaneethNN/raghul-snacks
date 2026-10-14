"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DeliveredItem = {
  orderNumber: string;
  productName: string;
  productSlug: string;
  productId: number;
};

export function DeliveryReviewNudge() {
  const [item, setItem] = useState<DeliveredItem | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        // Check if logged in
        const sessionRes = await fetch("/api/auth/session");
        if (!sessionRes.ok) return;
        const session = await sessionRes.json() as { account?: { id: number } };
        if (!session.account) return;

        // Get reviewed product IDs
        const reviewedRes = await fetch("/api/reviews/mine");
        const reviewedData = reviewedRes.ok
          ? await reviewedRes.json() as { reviewedProductIds: number[] }
          : { reviewedProductIds: [] };
        const reviewedIds = new Set(reviewedData.reviewedProductIds);

        // Get orders
        const ordersRes = await fetch("/api/orders/mine");
        if (!ordersRes.ok) return;
        const ordersData = await ordersRes.json() as {
          orders?: Array<{
            orderNumber: string;
            orderStatus: string;
            paymentStatus: string;
            items?: Array<{
              product: { id: number; name: string; slug: string } | null;
            }>;
          }>;
        };

        // Find first delivered paid order with an unreviewed product
        for (const order of ordersData.orders ?? []) {
          if (order.orderStatus !== "delivered" || order.paymentStatus !== "paid") continue;

          // Check if order has any items with valid product slugs not yet reviewed
          for (const i of order.items ?? []) {
            if (!i.product?.slug || !i.product?.id) continue;
            if (!reviewedIds.has(i.product.id)) {
              setItem({
                orderNumber: order.orderNumber,
                productName: i.product.name,
                productSlug: i.product.slug,
                productId: i.product.id,
              });
              setTimeout(() => setVisible(true), 1500);
              return;
            }
          }

          // Fallback: order delivered but items have no linked product (deleted products)
          // Show generic review nudge linking to orders page
          if ((order.items ?? []).length > 0) {
            const firstName = (order.items?.[0]?.name ?? "your order");
            setItem({
              orderNumber: order.orderNumber,
              productName: firstName,
              productSlug: "",
              productId: 0,
            });
            setTimeout(() => setVisible(true), 1500);
            return;
          }
        }
      } catch { /* silent */ }
    }
    check();
  }, []);

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!item || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? "0" : "20px"})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        zIndex: 99997,
        background: "var(--ink, #243127)",
        color: "#fff",
        borderRadius: 12,
        padding: "14px 18px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: "min(480px, calc(100vw - 32px))",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "var(--font-dm-sans, 'DM Sans', sans-serif)",
      }}
    >
      {/* Star icon */}
      <span style={{ fontSize: 22, flexShrink: 0 }}>⭐</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
          Your order is delivered!
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          How was {item.productName}?
        </p>
      </div>

      {/* Review link */}
      <Link
        href={item.productSlug ? `/product/${item.productSlug}#write-review` : `/account`}
        onClick={() => { setVisible(false); setDismissed(true); }}
        style={{
          flexShrink: 0,
          background: "var(--terracotta, #c95f3b)",
          color: "#fff",
          borderRadius: 8,
          padding: "7px 14px",
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        Leave a review
      </Link>

      {/* Close button */}
      <button
        onClick={() => { setVisible(false); setDismissed(true); }}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          lineHeight: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}

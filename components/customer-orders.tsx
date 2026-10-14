"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderTracker } from "@/components/order-tracker";
import styles from "./customer-orders.module.css";

type CustomerOrder = {
  orderNumber: string; customerName: string; city: string; state: string; pincode: string;
  total: number; orderStatus: string; paymentStatus: string; paymentMethod?: string | null;
  shippingStatus: string; awbCode: string | null; createdAt: string;
  items?: Array<{
    id: number; name: string; quantity: number; price: string; weight?: string | null;
    product: { id: number; name: string; slug: string; image: string | null; weight: string; } | null;
  }>;
};
type SavedOrder = { orderNumber: string; phone: string };

const statusLabels: Record<string, string> = { placed: "Order confirmed", packed: "Packed with care", dispatched: "On its way", delivered: "Delivered", cancelled: "Cancelled" };
const stages = ["placed", "packed", "dispatched", "delivered"];
const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function CustomerOrders() {
  const searchParams = useSearchParams();
  const isPostPayment = searchParams.get("success") === "true";

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [trackedOrder, setTrackedOrder] = useState<CustomerOrder | null>(null);
  const [saved, setSaved] = useState<SavedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);

  useEffect(() => {
    async function loadOrder() {
      try {
        const accountResponse = await fetch("/api/orders/mine");
        const accountData = await accountResponse.json() as { orders?: CustomerOrder[] };
        if (accountResponse.ok && accountData.orders?.length) {
          setOrders(accountData.orders);
          const reviewRes = await fetch('/api/reviews/mine');
          if (reviewRes.ok) {
            const rd = await reviewRes.json() as { reviewedProductIds?: number[] };
            setReviewedProductIds(rd.reviewedProductIds ?? []);
          }
          return;
        }
        const value = window.localStorage.getItem("raghul-snacks-last-order");
        if (!value) return;
        const parsed = JSON.parse(value) as SavedOrder;
        if (!/^RS-\d{8}$/i.test(parsed.orderNumber) || !/^[6-9]\d{9}$/.test(parsed.phone)) return;
        setSaved(parsed);
        const response = await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
        const data = await response.json() as { order?: CustomerOrder };
        if (response.ok && data.order) setTrackedOrder(data.order);
      } catch {} finally { setLoading(false); }
    }
    loadOrder();
  }, []);

  if (loading) return <section className={styles.loading}>Preparing your order confirmation…</section>;
  if (!orders.length && !trackedOrder) return <section className={styles.lookup}><div><p className="eyebrow">Your orders</p><h1>Find your fresh picks.</h1><p>Enter your order number and mobile number to view your latest delivery status.</p></div><OrderTracker initialOrder={saved?.orderNumber} /></section>;

  // Guest-tracked single order path (no account)
  const displayOrder = orders.length > 0 ? orders[0] : trackedOrder!;
  const stageIndex = stages.indexOf(displayOrder.orderStatus);

  const downloadInvoice = async (orderNumber: string) => {
    // Open invoice in new tab — browser will auto-print via window.onload
    window.open(`/api/orders/${orderNumber}/invoice`, "_blank");
  };

  return (
    <main className={styles.page}>
      <section className={styles.success}>
        <div className={styles.check}>✓</div>
        {isPostPayment ? (
          <>
            <p className="eyebrow">Payment successful</p>
            <h1>Thank you, {displayOrder.customerName.split(" ")[0]}.</h1>
            <p>Your payment is confirmed and your snacks are now being prepared.</p>
          </>
        ) : (
          <h1>Your Orders</h1>
        )}
        <div className={styles.reference}>
          <span>Order number</span>
          <strong>{displayOrder.orderNumber}</strong>
          <small>Keep this handy to track your delivery.</small>
        </div>
      </section>
      <section className={styles.grid}>
        <article className={styles.statusCard}>
          <div className={styles.cardHead}>
            <div>
              <p className="eyebrow">Order status</p>
              <h2>{statusLabels[displayOrder.orderStatus] || "Order received"}</h2>
            </div>
            <span className={styles.status}>{displayOrder.orderStatus}</span>
          </div>
          {displayOrder.orderStatus === "cancelled" && (
            <div className={styles.cancelledBanner}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              This order has been cancelled.
            </div>
          )}
          <ol className={styles.timeline} style={{ opacity: displayOrder.orderStatus === "cancelled" ? 0.4 : 1 }}>
            {stages.map((stage, index) => (
              <li className={index <= stageIndex ? styles.done : ""} key={stage}>
                <i>{index < stageIndex ? "✓" : index + 1}</i>
                <div>
                  <strong>{statusLabels[stage]}</strong>
                  <span>{index === 0 ? new Date(displayOrder.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : index === stageIndex ? "Current update" : "Pending"}</span>
                </div>
              </li>
            ))}
          </ol>
          {displayOrder.awbCode && (
            <div className={styles.awb}>
              <span>Tracking number</span>
              <strong>{displayOrder.awbCode}</strong>
            </div>
          )}
        </article>
        <aside className={styles.summary}>
          <p className="eyebrow">Order summary</p>
          <div><span>Payment</span><strong>{displayOrder.paymentStatus === "paid" ? "Paid · Razorpay" : displayOrder.paymentStatus}</strong></div>
          {displayOrder.paymentMethod && (
            <div><span>Method</span><strong>{(displayOrder.paymentMethod === "cod" || displayOrder.paymentMethod === "cash_on_delivery") ? "Cash on Delivery" : "Online Payment"}</strong></div>
          )}
          <div><span>Delivery to</span><strong>{displayOrder.city}, {displayOrder.state} · {displayOrder.pincode}</strong></div>
          <div className={styles.total}><span>Total paid</span><strong>{price.format(displayOrder.total)}</strong></div>

          {/* Items list with images and product links */}
          {displayOrder.items && displayOrder.items.length > 0 && (
            <div style={{ margin: "12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
              {displayOrder.items.map((item) => {
                const content = (
                  <>
                    <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.product?.image
                        ? <img src={item.product.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ fontSize: 16, fontWeight: 700, color: "var(--terracotta)", fontFamily: "'DM Sans',sans-serif" }}>{item.name.charAt(0).toUpperCase()}</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280", fontFamily: "'DM Mono',monospace" }}>
                        {item.weight || item.product?.weight ? `${item.weight || item.product?.weight}` : `Qty ${item.quantity}`}
                        {item.quantity > 1 && ` · ×${item.quantity}`}
                        {` · ${price.format(parseFloat(item.price) * item.quantity)}`}
                      </p>
                    </div>
                  </>
                );
                const itemLink = item.product?.slug ? (
                  <Link href={`/product/${item.product.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, textDecoration: "none", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--terracotta)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; }}>
                    {content}
                  </Link>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8 }}>
                    {content}
                  </div>
                );
                const showReviewBadge = displayOrder.paymentStatus === "paid" && displayOrder.orderStatus === "delivered" && item.product?.id && !reviewedProductIds.includes(item.product.id);
                return (
                  <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    {itemLink}
                    {showReviewBadge && item.product?.slug && (
                      <Link href={`/product/${item.product.slug}#reviews`} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, padding: "3px 10px", background: "rgba(196,79,49,0.08)", border: "1px solid rgba(196,79,49,0.25)", borderRadius: 20, fontSize: 11, fontWeight: 600, color: "var(--terracotta)", textDecoration: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        ✍ Review
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={() => downloadInvoice(displayOrder.orderNumber)} className="button button-outline" style={{ width: "100%", marginBottom: "12px" }}>Download Invoice</button>
          <Link href="/shop" className="button button-dark">Continue shopping →</Link>
        </aside>
      </section>

      {/* Additional orders (account users with multiple orders) */}
      {orders.length > 1 && (
        <section className={styles.pastOrders}>
          <h2>Past orders</h2>
          <div className={styles.pastOrdersList}>
            {orders.slice(1).map((o) => (
              <div key={o.orderNumber} className={styles.pastOrderRow}>
                <div>
                  <strong>{o.orderNumber}</strong>
                  <span>{new Date(o.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                </div>
                <div>
                  <span className={styles.status}>{o.orderStatus}</span>
                  <strong>{price.format(o.total)}</strong>
                </div>
                <Link href={`/track?order=${o.orderNumber}`} className="button button-outline">View Details</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className={styles.help}>Need help with this order? Keep your order number ready and contact us.</p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderTracker } from "@/components/order-tracker";
import styles from "./customer-orders.module.css";

type CustomerOrder = { orderNumber: string; customerName: string; city: string; state: string; pincode: string; total: number; orderStatus: string; paymentStatus: string; shippingStatus: string; awbCode: string | null; createdAt: string };
type SavedOrder = { orderNumber: string; phone: string };

const statusLabels: Record<string, string> = { placed: "Order confirmed", packed: "Packed with care", shipped: "On its way", delivered: "Delivered", cancelled: "Cancelled" };
const stages = ["placed", "packed", "shipped", "delivered"];
const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function CustomerOrders() {
  const searchParams = useSearchParams();
  const isPostPayment = searchParams.get("success") === "true";

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [trackedOrder, setTrackedOrder] = useState<CustomerOrder | null>(null);
  const [saved, setSaved] = useState<SavedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const accountResponse = await fetch("/api/orders/mine");
        const accountData = await accountResponse.json() as { orders?: CustomerOrder[] };
        if (accountResponse.ok && accountData.orders?.length) { setOrders(accountData.orders); return; }
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
    try {
      const response = await fetch(`/api/orders/${orderNumber}/invoice`);
      if (!response.ok) throw new Error("Failed to download invoice");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Failed to download invoice. Please try again.");
    }
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
          <ol className={styles.timeline}>
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
          <div><span>Payment</span><strong>{displayOrder.paymentStatus === "paid" ? "Paid · Cashfree" : displayOrder.paymentStatus}</strong></div>
          <div><span>Delivery to</span><strong>{displayOrder.city}, {displayOrder.state} · {displayOrder.pincode}</strong></div>
          <div className={styles.total}><span>Total paid</span><strong>{price.format(displayOrder.total)}</strong></div>
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

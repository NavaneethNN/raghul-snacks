"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderTracker } from "@/components/order-tracker";
import styles from "./customer-orders.module.css";

type CustomerOrder = { orderNumber: string; customerName: string; city: string; state: string; pincode: string; total: number; orderStatus: string; paymentStatus: string; shippingStatus: string; awbCode: string | null; createdAt: string };
type SavedOrder = { orderNumber: string; phone: string };

const statusLabels: Record<string, string> = { placed: "Order confirmed", packed: "Packed with care", shipped: "On its way", delivered: "Delivered", cancelled: "Cancelled" };
const stages = ["placed", "packed", "shipped", "delivered"];
const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function CustomerOrders() {
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [saved, setSaved] = useState<SavedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const accountResponse = await fetch("/api/orders/mine");
        const accountData = await accountResponse.json() as { orders?: CustomerOrder[] };
        if (accountResponse.ok && accountData.orders?.[0]) { setOrder(accountData.orders[0]); return; }
        const value = window.localStorage.getItem("raghul-snacks-last-order");
        if (!value) return;
        const parsed = JSON.parse(value) as SavedOrder;
        if (!/^RS-\d{8}$/i.test(parsed.orderNumber) || !/^[6-9]\d{9}$/.test(parsed.phone)) return;
        setSaved(parsed);
        const response = await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
        const data = await response.json() as { order?: CustomerOrder };
        if (response.ok && data.order) setOrder(data.order);
      } catch {} finally { setLoading(false); }
    }
    loadOrder();
  }, []);

  if (loading) return <section className={styles.loading}>Preparing your order confirmation…</section>;
  if (!order) return <section className={styles.lookup}><div><p className="eyebrow">Your orders</p><h1>Find your fresh picks.</h1><p>Enter your order number and mobile number to view your latest delivery status.</p></div><OrderTracker initialOrder={saved?.orderNumber} /></section>;

  const stageIndex = stages.indexOf(order.orderStatus);
  return <main className={styles.page}><section className={styles.success}><div className={styles.check}>✓</div><p className="eyebrow">Payment successful</p><h1>Thank you, {order.customerName.split(" ")[0]}.</h1><p>Your payment is confirmed and your snacks are now being prepared.</p><div className={styles.reference}><span>Order number</span><strong>{order.orderNumber}</strong><small>Keep this handy to track your delivery.</small></div></section><section className={styles.grid}><article className={styles.statusCard}><div className={styles.cardHead}><div><p className="eyebrow">Order status</p><h2>{statusLabels[order.orderStatus] || "Order received"}</h2></div><span className={styles.status}>{order.orderStatus}</span></div><ol className={styles.timeline}>{stages.map((stage, index) => <li className={index <= stageIndex ? styles.done : ""} key={stage}><i>{index < stageIndex ? "✓" : index + 1}</i><div><strong>{statusLabels[stage]}</strong><span>{index === 0 ? new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : index === stageIndex ? "Current update" : "Pending"}</span></div></li>)}</ol>{order.awbCode && <div className={styles.awb}><span>Tracking number</span><strong>{order.awbCode}</strong></div>}</article><aside className={styles.summary}><p className="eyebrow">Order summary</p><div><span>Payment</span><strong>{order.paymentStatus === "paid" ? "Paid · Cashfree" : order.paymentStatus}</strong></div><div><span>Delivery to</span><strong>{order.city}, {order.state} · {order.pincode}</strong></div><div className={styles.total}><span>Total paid</span><strong>{price.format(order.total)}</strong></div><Link href="/shop" className="button button-dark">Continue shopping →</Link></aside></section><p className={styles.help}>Need help with this order? Keep your order number ready and contact us.</p></main>;
}

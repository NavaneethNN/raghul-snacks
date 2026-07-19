"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-orders.module.css";

type AdminOrder = { id: number; orderNumber: string; customerName: string; phone: string; email: string | null; address: string; city: string; state: string; pincode: string; total: number; paymentStatus: string; orderStatus: string; shippingStatus: string; shipmentId: string | null; awbCode: string | null; createdAt: string };

type Status = "all" | "placed" | "packed" | "shipped" | "delivered" | "cancelled";
const statuses: Status[] = ["all", "placed", "packed", "shipped", "delivered", "cancelled"];
const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status>("all");
  const filtered = useMemo(() => orders.filter((order) => (filter === "all" || order.orderStatus === filter) && [order.orderNumber, order.customerName, order.phone, order.city, order.pincode].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [filter, orders, query]);
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const pending = orders.filter((order) => order.orderStatus === "placed").length;
  const dispatched = orders.filter((order) => order.orderStatus === "shipped").length;
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);

  async function setStatus(id: number, orderStatus: string) {
    setBusy(id); setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderStatus }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update order.");
      setMessage("Order status updated."); router.refresh();
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Unable to update order."); } finally { setBusy(null); }
  }

  return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Orders Management</p><h1>Orders</h1><p>Review payments, delivery details and fulfilment at a glance.</p></div></header><section className={styles.metrics}><div><span>Total orders</span><strong>{orders.length}</strong><small>Last 100 orders</small></div><div><span>To pack</span><strong>{pending}</strong><small>Placed and ready to fulfil</small></div><div><span>In transit</span><strong>{dispatched}</strong><small>Marked as shipped</small></div><div><span>Paid revenue</span><strong>{price.format(revenue)}</strong><small>{paid.length} successful payments</small></div></section><section className={styles.workspace}><div className={styles.toolbar}><label><span>Search orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order no., customer, phone or PIN" /></label><div className={styles.filters}>{statuses.map((status) => <button key={status} type="button" className={filter === status ? styles.activeFilter : ""} onClick={() => setFilter(status)}>{status === "all" ? "All" : status}</button>)}</div></div>{message && <p className={styles.message}>{message}</p>}{!orders.length ? <div className={styles.empty}><h2>No paid orders yet.</h2><p>Completed Cashfree orders will appear here automatically.</p></div> : !filtered.length ? <div className={styles.empty}><h2>No matching orders.</h2><p>Try another order status or search term.</p></div> : <div className={styles.list}>{filtered.map((order) => <article className={styles.order} key={order.id}><div className={styles.orderTop}><div><div className={styles.orderMeta}><strong>{order.orderNumber}</strong><span className={`${styles.badge} ${styles[order.orderStatus] || ""}`}>{order.orderStatus}</span><span className={styles.paid}>{order.paymentStatus}</span></div><p>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div><strong className={styles.total}>{price.format(order.total)}</strong></div><div className={styles.details}><div><span>Customer</span><strong>{order.customerName}</strong><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email && <a href={`mailto:${order.email}`}>{order.email}</a>}</div><div><span>Delivery address</span><strong>{order.address}</strong><p>{order.city}, {order.state} · {order.pincode}</p></div><div><span>Shipment</span><strong>{order.awbCode || "AWB pending"}</strong><p>{order.shippingStatus === "created" ? `Shipment ${order.shipmentId || "created"}` : "Shipment creation pending"}</p></div></div><div className={styles.orderFooter}><label>Fulfilment status<select value={order.orderStatus} disabled={busy === order.id} onChange={(event) => setStatus(order.id, event.target.value)}><option value="placed">Placed</option><option value="packed">Packed</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label>{busy === order.id && <span>Saving…</span>}</div></article>)}</div>}</section></div>;
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-orders.module.css";

type OrderItem = { id: number; name: string; quantity: number; price: number };
type AdminOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  paymentStatus: string;
  paymentMethod: string | null;
  orderStatus: string;
  shippingStatus: string;
  shipmentId: string | null;
  awbCode: string | null;
  createdAt: string;
  items: OrderItem[];
};

type Status = "all" | "placed" | "packed" | "shipped" | "delivered" | "cancelled";
const statuses: Status[] = ["all", "placed", "packed", "shipped", "delivered", "cancelled"];

// Status transitions: keys are current status, values are allowed next statuses
const allowedTransitions: Record<string, string[]> = {
  placed:    ["packed", "cancelled"],
  packed:    ["shipped", "cancelled"],
  shipped:   ["delivered"],
  delivered: [],      // terminal — no changes allowed
  cancelled: [],      // terminal — no changes allowed
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const paymentLabels: Record<string, string> = {
  upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking",
  wallet: "Wallet", emi: "EMI", online: "Online Payment", cod: "Cash on Delivery",
};

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  // Per-card feedback: id → { ok: boolean; msg: string }
  const [feedback, setFeedback] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status>("all");

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (filter === "all" || o.orderStatus === filter) &&
          [o.orderNumber, o.customerName, o.phone, o.city, o.pincode, o.email ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query.trim().toLowerCase())
      ),
    [filter, orders, query]
  );

  // Count per status for filter button badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      counts[o.orderStatus] = (counts[o.orderStatus] ?? 0) + 1;
    }
    return counts;
  }, [orders]);

  const paid      = orders.filter((o) => o.paymentStatus === "paid");
  const pending   = statusCounts["placed"] ?? 0;
  const dispatched = statusCounts["shipped"] ?? 0;
  const revenue   = paid.reduce((s, o) => s + o.total, 0);

  async function setStatus(id: number, orderStatus: string) {
    setBusy(id);
    setFeedback((prev) => ({ ...prev, [id]: { ok: true, msg: "" } }));
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus }),
      });
      const result = await res.json() as { error?: string };
      if (!res.ok) throw new Error(result.error ?? "Unable to update order.");
      setFeedback((prev) => ({ ...prev, [id]: { ok: true, msg: "✓ Status updated" } }));
      router.refresh();
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [id]: { ok: false, msg: err instanceof Error ? err.message : "Update failed" },
      }));
    } finally {
      setBusy(null);
      // Auto-clear feedback after 3s
      setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[id]; return n; }), 3000);
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Orders Management</p>
          <h1>Orders</h1>
          <p>Review payments, delivery details and fulfilment at a glance.</p>
        </div>
      </header>

      {/* ── Metrics ── */}
      <section className={styles.metrics}>
        <div>
          <span>Total orders</span>
          <strong>{orders.length}</strong>
          <small>Last 100 orders</small>
        </div>
        <div>
          <span>To pack</span>
          <strong>{pending}</strong>
          <small>{pending === 1 ? "Order" : "Orders"} placed &amp; ready</small>
        </div>
        <div>
          <span>In transit</span>
          <strong>{dispatched}</strong>
          <small>Marked as shipped</small>
        </div>
        <div>
          <span>Paid revenue</span>
          <strong>{fmt.format(revenue)}</strong>
          <small>{paid.length} successful payments</small>
        </div>
      </section>

      {/* ── Orders list ── */}
      <section id="orders-list" className={styles.workspace}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <label>
            <span>Search orders</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Order no., customer, phone or PIN"
            />
          </label>
          <div className={styles.filters}>
            {statuses.map((s) => {
              const count = s === "all" ? orders.length : (statusCounts[s] ?? 0);
              return (
                <button
                  key={s}
                  type="button"
                  className={filter === s ? styles.activeFilter : ""}
                  onClick={() => setFilter(s)}
                >
                  {s === "all" ? "All" : s}
                  <span className={styles.filterCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty states */}
        {!orders.length ? (
          <div className={styles.empty}>
            <h2>No paid orders yet.</h2>
            <p>Completed orders will appear here automatically.</p>
          </div>
        ) : !filtered.length ? (
          <div className={styles.empty}>
            <h2>No matching orders.</h2>
            <p>Try another status or search term.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((order) => {
              const fb = feedback[order.id];
              const isTerminal = allowedTransitions[order.orderStatus]?.length === 0;

              return (
                <article className={styles.order} key={order.id}>
                  {/* Top row */}
                  <div className={styles.orderTop}>
                    <div>
                      <div className={styles.orderMeta}>
                        <strong>{order.orderNumber}</strong>
                        <span className={`${styles.badge} ${styles[order.orderStatus] ?? ""}`}>
                          {order.orderStatus}
                        </span>
                        <span className={styles.paid}>{order.paymentStatus}</span>
                      </div>
                      <p>{new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                    <strong className={styles.total}>{fmt.format(order.total)}</strong>
                  </div>

                  {/* Items */}
                  <div className={styles.orderItems}>
                    <span>Order Items</span>
                    <ul>
                      {order.items?.length > 0
                        ? order.items.map((item) => (
                            <li key={item.id}>
                              <strong>{item.name}</strong>
                              <span>
                                {item.quantity} × {fmt.format(item.price)} = {fmt.format(item.quantity * item.price)}
                              </span>
                            </li>
                          ))
                        : <li><em>No items found</em></li>}
                    </ul>
                  </div>

                  {/* Details grid */}
                  <div className={styles.details}>
                    <div>
                      <span>Customer</span>
                      <strong>{order.customerName}</strong>
                      <a href={`tel:${order.phone}`}>{order.phone}</a>
                    </div>
                    <div>
                      <span>Delivery address</span>
                      <strong>{order.address}</strong>
                      <p>{order.city}, {order.state} · {order.pincode}</p>
                    </div>
                    <div>
                      <span>Shipment</span>
                      <strong>{order.awbCode ?? "AWB pending"}</strong>
                      <p>
                        {order.shippingStatus === "created"
                          ? `Shipment ${order.shipmentId ?? "created"}`
                          : "Shipment creation pending"}
                      </p>
                    </div>
                    <div>
                      <span>Payment mode</span>
                      <strong>{paymentLabels[order.paymentMethod ?? "online"] ?? (order.paymentMethod ?? "Online Payment")}</strong>
                    </div>
                  </div>

                  {/* Footer: fulfilment + inline feedback */}
                  <div className={styles.orderFooter}>
                    <label>
                      Fulfilment status
                      {isTerminal ? (
                        <span className={styles.terminalStatus}>
                          {order.orderStatus === "delivered" ? "✓ Delivered" : "✗ Cancelled"}
                        </span>
                      ) : (
                        <select
                          value={order.orderStatus}
                          disabled={busy === order.id}
                          onChange={(e) => setStatus(order.id, e.target.value)}
                        >
                          {/* Current status always first */}
                          <option value={order.orderStatus}>{order.orderStatus}</option>
                          {allowedTransitions[order.orderStatus]?.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </label>

                    {/* Inline feedback */}
                    {busy === order.id && (
                      <span className={styles.savingSpinner}>Saving…</span>
                    )}
                    {fb?.msg && (
                      <span className={fb.ok ? styles.feedbackOk : styles.feedbackError}>
                        {fb.msg}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

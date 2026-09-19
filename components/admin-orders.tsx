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

const allowedTransitions: Record<string, string[]> = {
  placed:    ["packed", "cancelled"],
  packed:    ["shipped", "cancelled"],
  shipped:   ["delivered"],
  delivered: [],
  cancelled: [],
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const paymentLabels: Record<string, string> = {
  upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking",
  wallet: "Wallet", emi: "EMI", online: "Online Payment", cod: "Cash on Delivery",
};

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status>("all");
  // Set of expanded order IDs
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) counts[o.orderStatus] = (counts[o.orderStatus] ?? 0) + 1;
    return counts;
  }, [orders]);

  const paid       = orders.filter((o) => o.paymentStatus === "paid");
  const pending    = statusCounts["placed"] ?? 0;
  const dispatched = statusCounts["shipped"] ?? 0;
  const revenue    = paid.reduce((s, o) => s + o.total, 0);

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
      setFeedback((prev) => ({ ...prev, [id]: { ok: true, msg: "✓ Updated" } }));
      router.refresh();
    } catch (err) {
      setFeedback((prev) => ({
        ...prev,
        [id]: { ok: false, msg: err instanceof Error ? err.message : "Update failed" },
      }));
    } finally {
      setBusy(null);
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
          <p>Tap an order to see details and update its status.</p>
        </div>
      </header>

      {/* ── Metrics ── */}
      <section className={styles.metrics}>
        <div>
          <span>Total orders</span>
          <strong>{orders.length}</strong>
          <small>All time</small>
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
          {/* ── Single row: search + filter dropdown (used on all screen sizes) ── */}
          <div className={styles.toolbarRow}>
            {/* Search */}
            <div className={styles.toolbarSearch}>
              <span className={styles.searchIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders…"
                aria-label="Search orders"
              />
            </div>

            {/* Filter dropdown (visible on all sizes) */}
            <div className={styles.filterDropdownWrap}>
              <svg className={styles.filterDropdownIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              <select
                className={styles.filterDropdown}
                value={filter}
                onChange={(e) => setFilter(e.target.value as Status)}
                aria-label="Filter by status"
              >
                {statuses.map((s) => {
                  const count = s === "all" ? orders.length : (statusCounts[s] ?? 0);
                  return (
                    <option key={s} value={s}>
                      {s === "all" ? `All (${count})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${count})`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* ── Desktop filter button row (hidden on mobile) ── */}
          <div className={styles.filters}>
            {statuses.map((s) => {
              const count = s === "all" ? orders.length : (statusCounts[s] ?? 0);
              return (
                <button key={s} type="button" className={filter === s ? styles.activeFilter : ""} onClick={() => setFilter(s)}>
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
              const isOpen     = expanded.has(order.id);
              const fb         = feedback[order.id];
              const isTerminal = allowedTransitions[order.orderStatus]?.length === 0;

              return (
                <article key={order.id} className={`${styles.order} ${isOpen ? styles.orderOpen : ""}`}>

                  {/* ── Collapsed summary row (always visible) ── */}
                  <button
                    className={styles.orderSummary}
                    onClick={() => toggleExpand(order.id)}
                    aria-expanded={isOpen}
                  >
                    {/* Left: order number + date */}
                    <div className={styles.summaryLeft}>
                      <span className={styles.orderNumber}>{order.orderNumber}</span>
                      <span className={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {/* Center: status badges */}
                    <div className={styles.summaryBadges}>
                      <span className={`${styles.badge} ${styles[order.orderStatus] ?? ""}`}>
                        {order.orderStatus}
                      </span>
                      <span className={styles.paid}>{order.paymentStatus}</span>
                    </div>

                    {/* Right: total + chevron */}
                    <div className={styles.summaryRight}>
                      <strong className={styles.total}>{fmt.format(order.total)}</strong>
                      <svg
                        className={`${styles.chevron} ${isOpen ? styles.chevronUp : ""}`}
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>
                  </button>

                  {/* ── Expanded detail panel ── */}
                  {isOpen && (
                    <div className={styles.orderDetail}>
                      {/* Items */}
                      <div className={styles.orderItems}>
                        <span>Order Items</span>
                        <ul>
                          {order.items?.length > 0
                            ? order.items.map((item) => (
                                <li key={item.id}>
                                  <strong>{item.name}</strong>
                                  <span>{item.quantity} × {fmt.format(item.price)} = {fmt.format(item.quantity * item.price)}</span>
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
                          <p>{order.shippingStatus === "created" ? `Shipment ${order.shipmentId ?? "created"}` : "Shipment creation pending"}</p>
                        </div>
                        <div>
                          <span>Payment mode</span>
                          <strong>{paymentLabels[order.paymentMethod ?? "online"] ?? (order.paymentMethod ?? "Online Payment")}</strong>
                        </div>
                      </div>

                      {/* Fulfilment footer */}
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
                              <option value={order.orderStatus}>{order.orderStatus}</option>
                              {allowedTransitions[order.orderStatus]?.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          )}
                        </label>
                        {busy === order.id && <span className={styles.savingSpinner}>Saving…</span>}
                        {fb?.msg && (
                          <span className={fb.ok ? styles.feedbackOk : styles.feedbackError}>{fb.msg}</span>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

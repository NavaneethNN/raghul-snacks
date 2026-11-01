"use client";

import { useMemo, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { useRouter } from "next/navigation";
import { parseWeightToKg, calculatePackagingBufferKg } from "@/lib/catalog";
import styles from "./admin-orders.module.css";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  weight?: string | null;
  productId?: number | null;
  variantId?: number | null;
};

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
  shippingActual?: number;
  shippingExtra?: number;
  paymentStatus: string;
  paymentMethod: string | null;
  orderStatus: string;
  shippingStatus: string;
  shipmentId: string | null;
  awbCode: string | null;
  createdAt: string;
  items: OrderItem[];
};

type Status = "all" | "placed" | "packed" | "dispatched" | "delivered" | "cancelled";
const statuses: Status[] = ["all", "placed", "packed", "dispatched", "delivered", "cancelled"];

const allowedTransitions: Record<string, string[]> = {
  placed:     ["packed", "cancelled"],
  packed:     ["dispatched", "cancelled"],
  dispatched: ["delivered"],
  delivered:  [],
  cancelled:  ["placed"], // allow admin to revert accidental cancellation
  shipped:    ["delivered"],
  preparing:  ["dispatched", "cancelled"],
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const paymentLabels: Record<string, string> = {
  upi: "UPI", card: "Credit / Debit Card", netbanking: "Net Banking",
  wallet: "Wallet", emi: "EMI", online: "Online Payment", cod: "Cash on Delivery",
};
const statusLabels: Record<string, string> = {
  placed: "Order Placed", packed: "Packed", dispatched: "Dispatched",
  delivered: "Delivered", cancelled: "Cancelled",
};

function computeOrderWeightKg(items: OrderItem[]): number {
  if (!items || items.length === 0) return 0.5;
  const sumKg = items.reduce((sum, item) => {
    const w = item.weight ? parseWeightToKg(item.weight) : 0.25;
    return sum + w * item.quantity;
  }, 0);
  const bufferKg = calculatePackagingBufferKg(sumKg);
  return Math.round((sumKg + bufferKg) * 100) / 100; // dynamic packaging parcel buffer
}

export function AdminOrders({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Record<number, { ok: boolean; msg: string }>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status>("all");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Book Courier Modal state
  const [bookingOrder, setBookingOrder] = useState<AdminOrder | null>(null);
  const [bookingWeight, setBookingWeight] = useState("");
  const [bookingLength, setBookingLength] = useState("15");
  const [bookingBreadth, setBookingBreadth] = useState("15");
  const [bookingHeight, setBookingHeight] = useState("10");
  const [bookingProvider, setBookingProvider] = useState<"shiprocket" | "manual">("shiprocket");
  const [bookingCourierName, setBookingCourierName] = useState("");
  const [bookingAwbCode, setBookingAwbCode] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  function openBookingModal(order: AdminOrder) {
    const defaultWeight = computeOrderWeightKg(order.items);
    setBookingOrder(order);
    setBookingWeight(defaultWeight.toString());
    setBookingLength("15");
    setBookingBreadth("15");
    setBookingHeight("10");
    setBookingProvider("shiprocket");
    setBookingCourierName(order.shipmentId || "");
    setBookingAwbCode(order.awbCode || "");
    setBookingError("");
  }

  async function handleBookCourier(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingOrder) return;
    const w = parseFloat(bookingWeight);
    if (isNaN(w) || w <= 0) {
      setBookingError("Please enter a valid weight in kg (e.g. 0.65)");
      return;
    }
    setBookingLoading(true);
    setBookingError("");
    try {
      const res = await fetch(`/api/admin/orders/${bookingOrder.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: w,
          length: parseFloat(bookingLength) || 15,
          breadth: parseFloat(bookingBreadth) || 15,
          height: parseFloat(bookingHeight) || 10,
          provider: bookingProvider,
          courierName: bookingCourierName.trim() || undefined,
          awbCode: bookingAwbCode.trim() || undefined,
        }),
      });
      const data = await res.json() as { success?: boolean; awbCode?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Courier booking failed");

      setFeedback((prev) => ({
        ...prev,
        [bookingOrder.id]: { ok: true, msg: `Courier Booked! AWB: ${data.awbCode || "Assigned"}` },
      }));
      setBookingOrder(null);
      router.refresh();
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Failed to book courier");
    } finally {
      setBookingLoading(false);
    }
  }

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

  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const pending = statusCounts["placed"] ?? 0;
  const dispatched = statusCounts["dispatched"] ?? 0;

  // 4-metric revenue breakdown
  const totalRevenue = paid.reduce((s, o) => s + o.total, 0);
  const actualCourierTotal = paid.reduce((s, o) => s + (Number(o.shippingActual) || 0), 0);
  const platformExtraTotal = paid.reduce((s, o) => {
    const act = Number(o.shippingActual) || 0;
    const fee = act > 0 ? (o.shippingExtra !== undefined ? Number(o.shippingExtra) : 2) : (Number(o.shippingExtra) || 0);
    return s + fee;
  }, 0);
  const productRevenue = Math.max(0, totalRevenue - actualCourierTotal - platformExtraTotal);

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
      setFeedback((prev) => ({ ...prev, [id]: { ok: true, msg: "Updated" } }));
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
      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Orders Management</p>
          <h1>Orders</h1>
          <p>Tap an order to see details and update its status.</p>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      {/* 4-Tier Revenue & Operational Metrics */}
      <section className={styles.metrics}>
        <div>
          <span>Total orders</span>
          <strong>{orders.length}</strong>
          <small>{pending} pending to pack</small>
        </div>
        <div>
          <span>Product Revenue</span>
          <strong>{fmt.format(productRevenue)}</strong>
          <small>Snack sales</small>
        </div>
        <div>
          <span>Courier Charges</span>
          <strong>{fmt.format(actualCourierTotal)}</strong>
          <small>Actual courier costs</small>
        </div>
        <div>
          <span>Platform Pool</span>
          <strong>{fmt.format(platformExtraTotal)}</strong>
          <small>₹2/order (Shiprocket plan)</small>
        </div>
        <div>
          <span>Total Revenue</span>
          <strong>{fmt.format(totalRevenue)}</strong>
          <small>{paid.length} paid orders</small>
        </div>
      </section>

      {/* Orders list */}
      <section id="orders-list" className={styles.workspace}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
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

            {/* Filter dropdown */}
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

          {/* Desktop filter button row */}
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
              const isOpen = expanded.has(order.id);
              const fb = feedback[order.id];
              const isTerminal = order.orderStatus === "delivered";
              const actualCourier = Number(order.shippingActual) || 0;
              const platformFee = actualCourier > 0 ? (order.shippingExtra !== undefined ? Number(order.shippingExtra) : 2) : (Number(order.shippingExtra) || 0);
              const snackSubtotal = Math.max(0, order.total - actualCourier - platformFee);

              return (
                <article key={order.id} className={`${styles.order} ${isOpen ? styles.orderOpen : ""}`}>
                  {/* Collapsed summary row */}
                  <button
                    className={styles.orderSummary}
                    onClick={() => toggleExpand(order.id)}
                    aria-expanded={isOpen}
                  >
                    <div className={styles.summaryLeft}>
                      <span className={styles.orderNumber}>{order.orderNumber}</span>
                      <span className={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div className={styles.summaryBadges}>
                      <span className={`${styles.badge} ${styles[order.orderStatus] ?? ""}`}>
                        {order.orderStatus}
                      </span>
                      <span className={styles.paid}>{order.paymentStatus}</span>
                    </div>

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

                  {/* Expanded detail panel */}
                  {isOpen && (
                    <div className={styles.orderDetail}>
                      {/* Financial Revenue Breakdown Card */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: 12,
                        background: "var(--cream)",
                        border: "1px solid var(--line)",
                        borderRadius: 8,
                        padding: "12px 16px",
                        marginBottom: 16,
                      }}>
                        <div>
                          <span style={{ display: "block", color: "#6b7280", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>Snacks Subtotal</span>
                          <strong style={{ fontSize: 14, color: "var(--ink)" }}>{fmt.format(snackSubtotal)}</strong>
                        </div>
                        <div>
                          <span style={{ display: "block", color: "#6b7280", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>Courier (Actual)</span>
                          <strong style={{ fontSize: 14, color: "var(--ink)" }}>{fmt.format(actualCourier)}</strong>
                        </div>
                        <div>
                          <span style={{ display: "block", color: "#6b7280", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}>Platform Fee</span>
                          <strong style={{ fontSize: 14, color: "var(--ink)" }}>{fmt.format(platformFee)}</strong>
                        </div>
                        <div>
                          <span style={{ display: "block", color: "var(--terracotta)", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", fontWeight: 700 }}>Total Collected</span>
                          <strong style={{ fontSize: 15, color: "var(--terracotta)" }}>{fmt.format(order.total)}</strong>
                        </div>
                      </div>

                      {/* Items */}
                      <div className={styles.orderItems}>
                        <div className={styles.orderItemsHeader}>
                          <span>Order Items ({order.items?.length ?? 0})</span>
                          <a
                            href={`/api/orders/${order.orderNumber}/invoice`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.invoiceBtn}
                            title="Print or view order invoice"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                              <rect x="6" y="14" width="12" height="8" />
                            </svg>
                            Print Invoice
                          </a>
                        </div>
                        <ul className={styles.orderItemsList}>
                          {order.items?.length > 0
                            ? order.items.map((item) => {
                                const hasVariant = Boolean(
                                  item.weight &&
                                  item.weight.trim() !== "" &&
                                  item.weight !== "-" &&
                                  item.weight !== "—"
                                );
                                return (
                                  <li key={item.id} className={styles.orderItemRow}>
                                    <div className={styles.orderItemMain}>
                                      <strong className={styles.orderItemName}>{item.name}</strong>
                                      {hasVariant && (
                                        <span className={styles.itemVariantBadge} title="Product Variant">
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.variantTagIcon}>
                                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                            <line x1="7" y1="7" x2="7.01" y2="7"/>
                                          </svg>
                                          <span className={styles.variantLabel}>Variant:</span>
                                          <strong>{item.weight}</strong>
                                        </span>
                                      )}
                                    </div>
                                    <div className={styles.orderItemMeta}>
                                      <span className={styles.orderItemQtyPrice}>
                                        <strong>{item.quantity}</strong> × {fmt.format(item.price)}
                                      </span>
                                      <span className={styles.orderItemLineTotal}>
                                        {fmt.format(item.quantity * item.price)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })
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

                      {/* Courier Booking & Dispatch Bar */}
                      {order.orderStatus === "packed" && (
                        order.shippingStatus === "created" && order.awbCode ? (
                          <div className={styles.courierBookedBar}>
                            <div className={styles.courierBookedText}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span>Courier Booked: <strong>{order.awbCode}</strong> {order.shipmentId ? `(${order.shipmentId})` : ""}</span>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <a
                                href={`https://shiprocket.co/tracking/${order.awbCode}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.courierTrackBtn}
                              >
                                Track Shipment →
                              </a>
                              <button
                                type="button"
                                onClick={() => openBookingModal(order)}
                                style={{ background: "none", border: "1px solid var(--line)", padding: "4px 8px", borderRadius: 4, fontSize: 11, color: "#6b7280", cursor: "pointer" }}
                              >
                                Re-book
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.bookCourierBar}>
                            <div className={styles.bookCourierInfo}>
                              <p className={styles.bookCourierTitle}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <rect x="1" y="3" width="15" height="13"/>
                                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                                  <circle cx="5.5" cy="18.5" r="2.5"/>
                                  <circle cx="18.5" cy="18.5" r="2.5"/>
                                </svg>
                                Order Packed — Courier Booking Ready
                              </p>
                              <p className={styles.bookCourierSubtitle}>
                                Enter the final kitchen scale weight to generate AWB and dispatch courier.
                              </p>
                            </div>
                            <button
                              type="button"
                              className={styles.bookCourierBtn}
                              onClick={() => openBookingModal(order)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                                <line x1="12" y1="22.08" x2="12" y2="12"/>
                              </svg>
                              Book Courier
                            </button>
                          </div>
                        )
                      )}

                      {/* If already dispatched and has tracking */}
                      {order.orderStatus === "dispatched" && order.awbCode && (
                        <div className={styles.courierBookedBar} style={{ marginTop: 12 }}>
                          <div className={styles.courierBookedText}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Dispatched via <strong>{order.shipmentId || "Courier"}</strong> · AWB: <strong>{order.awbCode}</strong></span>
                          </div>
                          <a
                            href={`https://shiprocket.co/tracking/${order.awbCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.courierTrackBtn}
                          >
                            Track Package →
                          </a>
                        </div>
                      )}

                      {/* Fulfilment footer */}
                      <div className={styles.orderFooter}>
                        <label>
                          Fulfilment status
                          {isTerminal ? (
                            <span className={styles.terminalStatus}>
                              {order.orderStatus === "delivered" ? "Delivered" : "Cancelled"}
                            </span>
                          ) : (
                            <select
                              value={order.orderStatus}
                              disabled={busy === order.id}
                              onChange={(e) => setStatus(order.id, e.target.value)}
                            >
                              <option value={order.orderStatus}>{statusLabels[order.orderStatus] ?? order.orderStatus}</option>
                              {allowedTransitions[order.orderStatus]?.map((s) => (
                                <option key={s} value={s}>{statusLabels[s] ?? s}</option>
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

      {/* Book Courier Modal */}
      {bookingOrder && (
        <div className={styles.modalOverlay} onClick={() => setBookingOrder(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Book Courier</h2>
                <p>Order {bookingOrder.orderNumber} · Packed &amp; Ready</p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setBookingOrder(null)}
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className={styles.modalOrderSummary}>
              <strong>Ship to:</strong> {bookingOrder.customerName} ({bookingOrder.phone})<br />
              {bookingOrder.address}, {bookingOrder.city}, {bookingOrder.state} – {bookingOrder.pincode}
            </div>

            <form onSubmit={handleBookCourier}>
              <div className={styles.modalFieldGroup}>
                <label>Measured Scale Weight (KG)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  required
                  className={styles.modalInput}
                  value={bookingWeight}
                  onChange={(e) => setBookingWeight(e.target.value)}
                  placeholder="e.g. 0.65"
                  autoFocus
                />
                <p className={styles.modalHelpText}>
                  Pre-filled with estimated snacks weight + 150g box. Enter the exact weight shown on your scale.
                </p>
              </div>

              <div className={styles.modalFieldGroup}>
                <label>Package Dimensions (CM)</label>
                <div className={styles.modalDimensionsRow}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={styles.modalInput}
                    value={bookingLength}
                    onChange={(e) => setBookingLength(e.target.value)}
                    placeholder="L (15)"
                    title="Length (cm)"
                  />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={styles.modalInput}
                    value={bookingBreadth}
                    onChange={(e) => setBookingBreadth(e.target.value)}
                    placeholder="B (15)"
                    title="Breadth (cm)"
                  />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className={styles.modalInput}
                    value={bookingHeight}
                    onChange={(e) => setBookingHeight(e.target.value)}
                    placeholder="H (10)"
                    title="Height (cm)"
                  />
                </div>
              </div>

              <div className={styles.modalFieldGroup}>
                <label>Dispatch Mode</label>
                <select
                  className={styles.modalInput}
                  value={bookingProvider}
                  onChange={(e) => setBookingProvider(e.target.value as "shiprocket" | "manual")}
                >
                  <option value="shiprocket">Shiprocket API (Automated AWB &amp; Pickup)</option>
                  <option value="manual">Manual Booking / Local Courier (DTDC, ST, India Post)</option>
                </select>
              </div>

              {bookingProvider === "manual" && (
                <>
                  <div className={styles.modalFieldGroup}>
                    <label>Courier Service Name</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={bookingCourierName}
                      onChange={(e) => setBookingCourierName(e.target.value)}
                      placeholder="e.g. DTDC, ST Courier, India Post Speed Post"
                      required
                    />
                  </div>
                  <div className={styles.modalFieldGroup}>
                    <label>Tracking / AWB Number</label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={bookingAwbCode}
                      onChange={(e) => setBookingAwbCode(e.target.value)}
                      placeholder="e.g. D12345678 or ST987654"
                      required
                    />
                  </div>
                </>
              )}

              {bookingError && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>
                  {bookingError}
                </div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setBookingOrder(null)}
                  disabled={bookingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Booking courier…" : "Confirm & Book Courier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

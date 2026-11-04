"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-dashboard.module.css";

type DashboardData = {
  metrics: {
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    revenueToday: number;
    ordersToday: number;
    revenueMonth: number;
    totalRevenue: number;
    productRevenue: number;
    courierCharges: number;
    platformFee: number;
    courierChargesToday: number;
    platformFeeToday: number;
    productRevenueToday: number;
    outOfStockCount: number;
    unreadMessagesCount: number;
  };
  sourceBreakdown: Record<string, { count: number; revenue: number }>;
  wallet?: {
    configured: boolean;
    balance: number;
    currency: string;
  };
  recentOrders: Array<{
    id: number;
    orderNumber: string;
    customerName: string;
    city: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    paymentMethod: string;
    orderSource: string;
    createdAt: string;
  }>;
};

const statusLabel: Record<string, string> = {
  placed: "Placed",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const sourceLabel: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  offline: "Offline",
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedFeedbackLink, setCopiedFeedbackLink] = useState(false);

  function handleCopyFeedbackLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://raghuldelights.in";
    const url = `${origin}/feedback`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedFeedbackLink(true);
      setTimeout(() => setCopiedFeedbackLink(false), 2200);
    }).catch(() => {});
  }

  function loadDashboard() {
    setRefreshing(true);
    fetch("/api/admin/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res: DashboardData) => {
        setData(res);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((res: DashboardData) => {
        if (active) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const fmt = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

  const todayStr = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const isWalletLow = Boolean(
    data?.wallet?.configured && data.wallet.balance < 100
  );

  return (
    <div className={styles.page}>
      {/* ── Page Header ── */}
      <header className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <p className={styles.eyebrow}>Store Overview</p>
          <h1>Admin Dashboard</h1>
          <p>Real-time summary of sales, pending orders, and courier operations.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.dateBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{todayStr}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyFeedbackLink}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 13px",
              background: copiedFeedbackLink ? "#f0fdf4" : "#ffffff",
              border: `1.5px solid ${copiedFeedbackLink ? "#86efac" : "var(--line, #e5e0d8)"}`,
              color: copiedFeedbackLink ? "#166534" : "var(--ink, #243127)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            title="Copy the direct WhatsApp customer review link"
          >
            {copiedFeedbackLink ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>✓ Link Copied!</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                <span>Review Form Link</span>
              </>
            )}
          </button>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={loadDashboard}
            disabled={refreshing}
            title="Refresh dashboard data"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={refreshing ? styles.spin : ""}
            >
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>Refresh</span>
          </button>
          <div className={styles.headerBell}>
            <AdminHeaderActions />
          </div>
        </div>
      </header>

      {/* ── Shiprocket Wallet Warning (if low) ── */}
      {isWalletLow && (
        <div className={styles.walletAlert}>
          <div className={styles.walletAlertContent}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Low Shiprocket Wallet Balance: ₹{data?.wallet?.balance.toFixed(2)}</strong>
              <p>Recharge your courier balance (below ₹100 threshold) to avoid shipping label generation disruptions.</p>
            </div>
          </div>
          <a
            href="https://app.shiprocket.in/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.rechargeAlertBtn}
          >
            Recharge Now ↗
          </a>
        </div>
      )}

      {/* ── Customer Messages Notice (if any unread) ── */}
      {(data?.metrics.unreadMessagesCount ?? 0) > 0 && (
        <div style={{ margin: "16px 32px 0", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
            You have {data?.metrics.unreadMessagesCount} unread customer enquiry message(s).
          </span>
          <Link href="/admin/messages" style={{ fontSize: 12.5, fontWeight: 700, color: "#b91c1c", textDecoration: "underline" }}>
            View Messages →
          </Link>
        </div>
      )}

      {/* ── Key Financial & Business KPIs ── */}
      <section className={styles.kpiGrid}>
        {/* Total Orders */}
        <Link href="/admin/orders" className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Orders</span>
          <strong className={styles.kpiValue}>
            {loading ? <span className={styles.skeleton} /> : data?.metrics.totalOrders ?? 0}
          </strong>
          <small className={styles.kpiSub}>All registered orders</small>
        </Link>

        {/* Today's Revenue */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Today&apos;s Revenue</span>
          <strong className={styles.kpiValue} style={{ color: "var(--terracotta)" }}>
            {loading ? <span className={styles.skeleton} /> : fmt.format(data?.metrics.revenueToday ?? 0)}
          </strong>
          <small className={styles.kpiSub}>
            {loading ? "…" : `${data?.metrics.ordersToday ?? 0} orders placed today`}
          </small>
        </div>

        {/* Total Revenue */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Revenue</span>
          <strong className={styles.kpiValue}>
            {loading ? <span className={styles.skeleton} /> : fmt.format(data?.metrics.totalRevenue ?? 0)}
          </strong>
          <small className={styles.kpiSub}>All-time paid customer orders</small>
        </div>

        {/* Product Sales */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Product Sales (Snacks)</span>
          <strong className={styles.kpiValue} style={{ color: "#15803d" }}>
            {loading ? <span className={styles.skeleton} /> : fmt.format(data?.metrics.productRevenue ?? 0)}
          </strong>
          <small className={styles.kpiSub}>Net value of snacks &amp; sweets</small>
        </div>

        {/* Courier Charges */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Courier Charges</span>
          <strong className={styles.kpiValue} style={{ color: "#0369a1" }}>
            {loading ? <span className={styles.skeleton} /> : fmt.format(data?.metrics.courierCharges ?? 0)}
          </strong>
          <small className={styles.kpiSub}>Actual courier delivery cost</small>
        </div>

        {/* Platform Fee */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Platform Fee</span>
          <strong className={styles.kpiValue} style={{ color: "#7c3aed" }}>
            {loading ? <span className={styles.skeleton} /> : fmt.format(data?.metrics.platformFee ?? 0)}
          </strong>
          <small className={styles.kpiSub}>Packaging &amp; platform fee (₹5)</small>
        </div>

        {/* Shiprocket Wallet */}
        <div className={`${styles.kpiCard} ${styles.walletCard}`}>
          <div className={styles.walletTopRow}>
            <span className={styles.kpiLabel}>Shiprocket Wallet</span>
            <a
              href="https://app.shiprocket.in/billing/recharge"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.walletRechargeLink}
              title="Open Shiprocket Wallet Recharge"
            >
              + Recharge ↗
            </a>
          </div>
          <strong className={styles.kpiValue}>
            {loading ? (
              <span className={styles.skeleton} />
            ) : data?.wallet?.configured ? (
              <span style={{ color: data.wallet.balance < 100 ? "#dc2626" : "var(--ink)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {fmt.format(data.wallet.balance)}
                {data.wallet.balance < 100 && (
                  <span style={{ fontSize: 10.5, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                    Low
                  </span>
                )}
              </span>
            ) : (
              "₹0"
            )}
          </strong>
          <small className={styles.kpiSub}>
            {data?.wallet?.configured ? "Live courier wallet balance" : "Shiprocket not connected"}
          </small>
        </div>
      </section>

      {/* ── Two-Column Main Content: Recent Orders + Channel Breakdown & Actions ── */}
      <div className={styles.mainGrid}>
        {/* Left Column: Recent Orders */}
        <section className={styles.recentOrdersSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Recent Orders</h2>
              <p>Latest customer purchases and manual courier bookings</p>
            </div>
            <Link href="/admin/orders" className={styles.viewAllBtn}>
              View All Orders →
            </Link>
          </div>

          <div className={styles.recentOrdersList}>
            {loading ? (
              [1, 2, 3, 4].map((i) => <div key={i} className={styles.orderSkeleton} />)
            ) : !data?.recentOrders || data.recentOrders.length === 0 ? (
              <div className={styles.emptyOrders}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <p>No orders recorded yet.</p>
              </div>
            ) : (
              data.recentOrders.map((order) => {
                const dateFmt = new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }).format(new Date(order.createdAt));

                const sourceKey = (order.orderSource || "website").toLowerCase();

                return (
                  <Link
                    key={order.orderNumber}
                    href={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}
                    className={styles.orderCard}
                  >
                    <div className={styles.orderCardLeft}>
                      <div className={styles.orderCardIdRow}>
                        <strong className={styles.orderNumber}>{order.orderNumber}</strong>
                        {sourceKey !== "website" && (
                          <span className={`${styles.sourcePill} ${styles[`source_${sourceKey}`] || ""}`}>
                            {sourceLabel[sourceKey] || sourceKey}
                          </span>
                        )}
                      </div>
                      <div className={styles.orderCustomer}>
                        <span>{order.customerName}</span>
                        {order.city && <span className={styles.orderCity}>· {order.city}</span>}
                      </div>
                      <span className={styles.orderTime}>{dateFmt}</span>
                    </div>

                    <div className={styles.orderCardRight}>
                      <strong className={styles.orderAmount}>{fmt.format(order.total)}</strong>
                      <div className={styles.orderBadges}>
                        <span className={`${styles.statusBadge} ${styles[`status_${order.orderStatus}`] || ""}`}>
                          {statusLabel[order.orderStatus] || order.orderStatus}
                        </span>
                        <span className={`${styles.paymentBadge} ${order.paymentStatus === "paid" ? styles.paymentPaid : styles.paymentPending}`}>
                          {order.paymentStatus === "paid" ? "Paid" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Channel Breakdown & Quick Shortcuts */}
        <div className={styles.sidebarColumn}>
          {/* Sales Channels Breakdown */}
          <section className={styles.channelSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Order Channels</h2>
                <p>Volume and revenue by sales channel</p>
              </div>
            </div>

            <div className={styles.channelList}>
              {["website", "whatsapp", "instagram", "offline"].map((channelKey) => {
                const channelData = data?.sourceBreakdown?.[channelKey] || { count: 0, revenue: 0 };
                const totalOrdersCount = data?.metrics.totalOrders || 1;
                const percentage = Math.round((channelData.count / (totalOrdersCount || 1)) * 100);

                return (
                  <div key={channelKey} className={styles.channelItem}>
                    <div className={styles.channelRow}>
                      <div className={styles.channelNameWrap}>
                        <span className={`${styles.channelDot} ${styles[`channelDot_${channelKey}`]}`} />
                        <strong className={styles.channelTitle}>{sourceLabel[channelKey]}</strong>
                      </div>
                      <div className={styles.channelStats}>
                        <span className={styles.channelCount}>{channelData.count} orders</span>
                        <strong className={styles.channelRev}>{fmt.format(channelData.revenue)}</strong>
                      </div>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div
                        className={`${styles.progressBarFill} ${styles[`progress_${channelKey}`]}`}
                        style={{ width: `${Math.max(percentage, channelData.count > 0 ? 5 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Actions Shortcuts */}
          <section className={styles.shortcutsSection}>
            <h2>Quick Management</h2>
            <div className={styles.shortcutsGrid}>
              <Link href="/admin/orders" className={styles.shortcutBtn}>
                <div className={styles.shortcutIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
                <div>
                  <strong>Book Courier / Order</strong>
                  <p>WhatsApp, Insta &amp; offline orders</p>
                </div>
              </Link>

              <Link href="/admin/products" className={styles.shortcutBtn}>
                <div className={styles.shortcutIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="6"/>
                    <path d="M15.5 13.5c-1.5-1-3.5-1-5 0"/>
                  </svg>
                </div>
                <div>
                  <strong>Snack Catalog</strong>
                  <p>{data?.metrics.totalProducts ?? 0} active products</p>
                </div>
              </Link>

              <Link href="/admin/combos" className={styles.shortcutBtn}>
                <div className={styles.shortcutIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="8" width="18" height="12" rx="2"/>
                    <path d="M12 8v-4"/>
                    <path d="M8 4h8"/>
                  </svg>
                </div>
                <div>
                  <strong>Combo Boxes</strong>
                  <p>Curated snack gift packs</p>
                </div>
              </Link>

              <Link href="/admin/packaging" className={styles.shortcutBtn}>
                <div className={styles.shortcutIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </div>
                <div>
                  <strong>Packaging Boxes</strong>
                  <p>Box sizes &amp; shipping weight</p>
                </div>
              </Link>

              <Link href="/admin/coupons" className={styles.shortcutBtn}>
                <div className={styles.shortcutIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <circle cx="9" cy="11" r="1"/>
                    <circle cx="15" cy="11" r="1"/>
                  </svg>
                </div>
                <div>
                  <strong>Coupons</strong>
                  <p>Discounts &amp; promotions</p>
                </div>
              </Link>

              <Link href="/admin/messages" className={styles.shortcutBtn}>
                <div className={styles.shortcutIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <strong>Messages &amp; Enquiries</strong>
                  <p>
                    {(data?.metrics.unreadMessagesCount ?? 0) > 0
                      ? `${data?.metrics.unreadMessagesCount} unread enquiries`
                      : "Website contact submissions"}
                  </p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

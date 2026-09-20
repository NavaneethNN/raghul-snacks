"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-dashboard.module.css";

const statusLabel: Record<string, string> = {
  placed: "Placed", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled",
};

const quickLinks = [
  {
    href: "/admin/orders",
    label: "Orders",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>,
    description: "View and fulfil customer orders",
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"></circle><path d="M15.5 13.5c-1.5-1-3.5-1-5 0"></path><path d="M8.5 17.5c1.5 1.5 3 2 5.5 2s4-.5 5.5-2"></path></svg>,
    description: "Add, edit and manage your catalog",
  },
  {
    href: "/admin/combos",
    label: "Combos",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M12 8v-4"></path><path d="M8 4h8"></path></svg>,
    description: "Create and manage product bundles",
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="11" r="1"></circle><circle cx="15" cy="11" r="1"></circle></svg>,
    description: "Set up discount codes for customers",
  },
];

export function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Array<{
    orderNumber: string;
    customerName: string;
    total: number;
    orderStatus: string;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => { setMetrics(data.metrics); setRecentOrders(data.recentOrders); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin Dashboard</p>
          <h1>Welcome back!</h1>
          <p>Here's what's happening in your store today.</p>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      {/* ── Metrics ── */}
      <section className={styles.metrics}>
        <Link href="/admin/orders" className={styles.metricCard}>
          <span>Total Orders</span>
          <strong>{loading ? <span className={styles.skeleton} /> : metrics.totalOrders}</strong>
          <small>All time</small>
        </Link>
        <Link href="/admin/products" className={styles.metricCard}>
          <span>Products</span>
          <strong>{loading ? <span className={styles.skeleton} /> : metrics.totalProducts}</strong>
          <small>In catalog</small>
        </Link>
        <div className={styles.metricCard}>
          <span>Revenue</span>
          <strong>{loading ? <span className={styles.skeleton} /> : fmt.format(metrics.revenue)}</strong>
          <small>This month (paid orders)</small>
        </div>
        <Link href="/admin/customers" className={styles.metricCard}>
          <span>Customers</span>
          <strong>{loading ? <span className={styles.skeleton} /> : metrics.totalCustomers}</strong>
          <small>Registered accounts</small>
        </Link>
      </section>

      {/* ── Quick Actions ── */}
      <section className={styles.quickLinks}>
        <h2>Quick Actions</h2>
        <div className={styles.grid}>
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.card}>
              <span className={styles.icon}>{link.icon as React.ReactNode}</span>
              <div>
                <h3>{link.label}</h3>
                <p>{link.description}</p>
              </div>
              <svg className={styles.cardArrow} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent Orders ── */}
      <section className={styles.recentActivity}>
        <div className={styles.recentHeader}>
          <h2>Recent Orders</h2>
          <Link href="/admin/orders" className={styles.viewAll}>View all →</Link>
        </div>
        <div className={styles.activityCard}>
          {loading ? (
            <div className={styles.orderList}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.orderItemSkeleton} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className={styles.emptyState}>No recent orders to display</p>
          ) : (
            <div className={styles.orderList}>
              {recentOrders.map((order) => (
                <Link
                  key={order.orderNumber}
                  href={`/admin/orders?q=${encodeURIComponent(order.orderNumber)}`}
                  className={styles.orderItem}
                >
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <small>{order.customerName}</small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{fmt.format(order.total)}</strong>
                    <small className={styles[`status_${order.orderStatus}`] ?? ""}>
                      {statusLabel[order.orderStatus] ?? order.orderStatus}
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

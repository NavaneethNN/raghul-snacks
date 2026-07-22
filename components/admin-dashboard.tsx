"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./admin-dashboard.module.css";

const quickLinks = [
  {
    href: "/admin/orders",
    label: "View Orders",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>,
    description: "Manage customer orders"
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="6"></circle><path d="M15.5 13.5c-1.5-1-3.5-1-5 0"></path><path d="M8.5 17.5c1.5 1.5 3 2 5.5 2s4-0.5 5.5-2"></path></svg>,
    description: "Add & edit products"
  },
  {
    href: "/admin/combos",
    label: "Combos",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="8" width="18" height="12" rx="2"></rect><path d="M12 8v-4"></path><path d="M8 4h8"></path></svg>,
    description: "Create product bundles"
  },
  {
    href: "/admin/coupons",
    label: "Coupons",
    icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><circle cx="9" cy="11" r="1"></circle><circle cx="15" cy="11" r="1"></circle></svg>,
    description: "Discount codes"
  },
];

export function AdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await fetch("/api/admin/dashboard");
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
          setRecentOrders(data.recentOrders);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  async function handleSignOut() {
    try {
      const response = await fetch("/api/admin/auth", { method: "DELETE" });
      if (response.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }

  const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin Dashboard</p>
          <h1>Welcome back!</h1>
          <p>Manage your store, orders, and products from here.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.notificationButton} title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
          <button className={styles.signOutButton} onClick={handleSignOut}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <div>
          <span>Total Orders</span>
          <strong>{loading ? "..." : metrics.totalOrders}</strong>
          <small>All time</small>
        </div>
        <div>
          <span>Products</span>
          <strong>{loading ? "..." : metrics.totalProducts}</strong>
          <small>Active products</small>
        </div>
        <div>
          <span>Revenue</span>
          <strong>{loading ? "..." : price.format(metrics.revenue)}</strong>
          <small>This month</small>
        </div>
        <div>
          <span>Customers</span>
          <strong>{loading ? "..." : metrics.totalCustomers}</strong>
          <small>Total customers</small>
        </div>
      </section>

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
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.recentActivity}>
        <h2>Recent Orders</h2>
        <div className={styles.activityCard}>
          {loading ? (
            <p className={styles.emptyState}>Loading recent orders...</p>
          ) : recentOrders.length === 0 ? (
            <p className={styles.emptyState}>No recent orders to display</p>
          ) : (
            <div className={styles.orderList}>
              {recentOrders.map((order) => (
                <Link key={order.orderNumber} href="/admin/orders#orders-list" className={styles.orderItem}>
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <small>{order.customerName}</small>
                  </div>
                  <div>
                    <strong>{price.format(order.total)}</strong>
                    <small className={order.orderStatus}>{order.orderStatus}</small>
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

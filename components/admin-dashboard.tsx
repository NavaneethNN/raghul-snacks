"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Admin Dashboard</p>
          <h1>Welcome back!</h1>
          <p>Manage your store, orders, and products from here.</p>
        </div>
        <button className={styles.signOutButton} onClick={signOut}>
          Sign out
        </button>
      </header>

      <section className={styles.metrics}>
        <div>
          <span>Total Orders</span>
          <strong>—</strong>
          <small>Connect database to view</small>
        </div>
        <div>
          <span>Products</span>
          <strong>—</strong>
          <small>Active products</small>
        </div>
        <div>
          <span>Revenue</span>
          <strong>₹—</strong>
          <small>This month</small>
        </div>
        <div>
          <span>Customers</span>
          <strong>—</strong>
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
        <h2>Recent Activity</h2>
        <div className={styles.activityCard}>
          <p className={styles.emptyState}>No recent activity to display</p>
        </div>
      </section>
    </div>
  );
}

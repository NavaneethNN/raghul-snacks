"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin-dashboard.module.css";

const quickLinks = [
  { href: "/admin/orders", label: "View Orders", icon: "📦", description: "Manage customer orders" },
  { href: "/admin/products", label: "Products", icon: "🥜", description: "Add & edit products" },
  { href: "/admin/combos", label: "Combos", icon: "🎁", description: "Create product bundles" },
  { href: "/admin/coupons", label: "Coupons", icon: "🎟️", description: "Discount codes" },
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
              <span className={styles.icon}>{link.icon}</span>
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

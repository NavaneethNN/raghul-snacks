"use client";

import { useRouter } from "next/navigation";
import styles from "./admin-dashboard.module.css";

export function AdminAnalytics() {
  const router = useRouter();


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Business Analytics</p>
          <h1>Analytics Dashboard</h1>
          <p>Track your store performance and sales metrics.</p>
        </div>
      </header>

      <section className={styles.metrics}>
        <div>
          <span>Revenue (This Month)</span>
          <strong>₹—</strong>
          <small>No sales data yet</small>
        </div>
        <div>
          <span>Orders (This Month)</span>
          <strong>—</strong>
          <small>Connect database to view</small>
        </div>
        <div>
          <span>Avg Order Value</span>
          <strong>₹—</strong>
          <small>Based on recent orders</small>
        </div>
        <div>
          <span>Conversion Rate</span>
          <strong>—%</strong>
          <small>Visitors to customers</small>
        </div>
      </section>

      <div style={{ padding: '0 40px 40px' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '48px 32px', textAlign: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#d1d5db', margin: '0 auto 16px' }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>Analytics Coming Soon</h3>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>Detailed charts and reports will be available once you have order data.</p>
        </div>
      </div>
    </div>
  );
}

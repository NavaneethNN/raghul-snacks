"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

export function AdminCoupons() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Discount Management</p>
          <h1>Coupons</h1>
          <p>Create and manage discount codes for your customers.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Coupon
          </button>
          <button className={styles.signOutButton} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <label>
            <span>Search coupons</span>
            <input type="text" placeholder="Search by code..." />
          </label>
          <div className={styles.filters}>
            <button className={styles.activeFilter}>All</button>
            <button>Active</button>
            <button>Inactive</button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Discount Type</th>
                <th>Value</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      <circle cx="9" cy="11" r="1"></circle>
                      <circle cx="15" cy="11" r="1"></circle>
                    </svg>
                    <h3>No coupons yet</h3>
                    <p>Create discount codes to attract customers.</p>
                    <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                      Create Coupon
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Create Coupon</h2>
              <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form}>
              <div className={styles.field}>
                <label>Coupon Code</label>
                <input type="text" placeholder="e.g., WELCOME10" required style={{ textTransform: 'uppercase' }} />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Use uppercase letters and numbers only.</small>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Discount Type</label>
                  <select required>
                    <option value="">Select type</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Discount Value</label>
                  <input type="number" step="0.01" placeholder="0.00" required />
                </div>
              </div>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input type="checkbox" defaultChecked />
                  <span>Active</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

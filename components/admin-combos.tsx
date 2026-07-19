"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

export function AdminCombos() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Bundle Management</p>
          <h1>Product Combos</h1>
          <p>Create product bundles to increase average order value.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Combo
        </button>
      </header>

      <section className={styles.workspace}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Combo Name</th>
                <th>Products</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="8" width="18" height="12" rx="2"></rect>
                      <path d="M12 8v-4"></path>
                      <path d="M8 4h8"></path>
                    </svg>
                    <h3>No combos yet</h3>
                    <p>Bundle products together to boost sales.</p>
                    <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                      Create Combo
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
              <h2>Create Product Combo</h2>
              <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form}>
              <div className={styles.field}>
                <label>Combo Title</label>
                <input type="text" placeholder="e.g., Millet Starter Box" required />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Price (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className={styles.field}>
                  <label>Discount (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>
              <div className={styles.field}>
                <label>Products in Combo</label>
                <small style={{ color: '#6b7280', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  Select products to include in this bundle
                </small>
                <div style={{ border: '1.5px solid #d1d5db', borderRadius: '8px', padding: '16px', background: '#fafbfc' }}>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Product selection will be available after adding products to your catalog.</p>
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Create Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

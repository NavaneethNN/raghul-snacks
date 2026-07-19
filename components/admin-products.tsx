"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

export function AdminProducts() {
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
          <p className={styles.eyebrow}>Product Management</p>
          <h1>Products</h1>
          <p>Add, edit, and manage your product catalog.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Product
          </button>
          <button className={styles.signOutButton} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <label>
            <span>Search products</span>
            <input type="text" placeholder="Search by name or SKU..." />
          </label>
          <div className={styles.filters}>
            <button className={styles.activeFilter}>All</button>
            <button>Featured</button>
            <button>Bestsellers</button>
            <button>Low Stock</button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="6"></circle>
                      <path d="M15.5 13.5c-1.5-1-3.5-1-5 0"></path>
                    </svg>
                    <h3>No products yet</h3>
                    <p>Add your first product to get started.</p>
                    <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                      Add Product
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
              <h2>Add New Product</h2>
              <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Product Name</label>
                  <input type="text" placeholder="e.g., Thinai Laddu" required />
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <select required>
                    <option value="">Select category</option>
                    <option>Laddus</option>
                    <option>Podis</option>
                    <option>Kadalai</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Price (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className={styles.field}>
                  <label>Offer Price (₹)</label>
                  <input type="number" step="0.01" placeholder="Optional" />
                </div>
                <div className={styles.field}>
                  <label>Weight</label>
                  <input type="text" placeholder="e.g., 250g" required />
                </div>
                <div className={styles.field}>
                  <label>Stock Quantity</label>
                  <input type="number" placeholder="0" required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea rows={4} placeholder="Product description..." required></textarea>
              </div>
              <div className={styles.field}>
                <label>Ingredients</label>
                <textarea rows={3} placeholder="List ingredients..."></textarea>
              </div>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input type="checkbox" />
                  <span>Featured Product</span>
                </label>
                <label className={styles.checkbox}>
                  <input type="checkbox" />
                  <span>Bestseller</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

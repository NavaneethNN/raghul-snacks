"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

export function AdminCategories() {
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
          <p className={styles.eyebrow}>Category Management</p>
          <h1>Categories</h1>
          <p>Organize your products into categories.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Category
          </button>
          <button className={styles.signOutButton} onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Product Count</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  <div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <h3>No categories yet</h3>
                    <p>Create your first category to organize products.</p>
                    <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                      Add Category
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
              <h2>Add New Category</h2>
              <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form}>
              <div className={styles.field}>
                <label>Category Name</label>
                <input type="text" placeholder="e.g., Laddus" required />
              </div>
              <div className={styles.field}>
                <label>Slug (URL-friendly name)</label>
                <input type="text" placeholder="e.g., laddus" required />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Used in URLs. Only lowercase letters, numbers, and hyphens.</small>
              </div>
              <div className={styles.field}>
                <label>Category Image URL</label>
                <input type="text" placeholder="https://..." />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

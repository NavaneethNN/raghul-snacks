"use client";

import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

export function AdminReviews() {
  const router = useRouter();


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Review Management</p>
          <h1>Customer Reviews</h1>
          <p>Moderate and manage product reviews.</p>
        </div>
        <div className={styles.headerActions}>
          
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <label>
            <span>Search reviews</span>
            <input type="text" placeholder="Search by product or customer..." />
          </label>
          <div className={styles.filters}>
            <button className={styles.activeFilter}>All</button>
            <button>Pending</button>
            <button>Approved</button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <h3>No reviews yet</h3>
                    <p>Customer reviews will appear here.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

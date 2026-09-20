"use client";

import React from "react";
import { useEffect, useState } from "react";
import styles from "./admin-table.module.css";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpent: string;
};

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  function toggle(id: number) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Customer Management</p>
          <h1>Customers</h1>
          <p>View and manage your customer database.</p>
        </div>
      </header>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarSearch}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name, email or phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Customer</th>
                <th className={styles.colHide}>Email</th>
                <th className={styles.colHide}>Phone</th>
                <th>Orders</th>
                <th>Spent</th>
                <th className={styles.colHide}>Joined</th>
                {/* chevron column — mobile only */}
                <th className={styles.colHideDesktop} style={{ width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={styles.emptyState}><div><p>Loading…</p></div></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyState}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                      </svg>
                      <h3>No customers found</h3>
                      <p>{searchQuery ? "Try a different search term." : "Customer data will appear here once you have orders."}</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((c) => {
                const isOpen = expanded === c.id;
                return (
                  <React.Fragment key={c.id}>
                    {/* Main row — always visible on all screen sizes */}
                    <tr
                      key={`row-${c.id}`}
                      onClick={() => toggle(c.id)}
                      style={{ cursor: "pointer" }}
                      className={isOpen ? styles.rowOpen : ""}
                    >
                      <td><strong>{c.name}</strong></td>
                      <td className={styles.colHide}>{c.email ?? "—"}</td>
                      <td className={styles.colHide}>{c.phone}</td>
                      <td>{c.orderCount}</td>
                      <td><strong>{fmt.format(Number(c.totalSpent))}</strong></td>
                      <td className={styles.colHide}>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                      {/* Chevron — only meaningful on mobile where some cols are hidden */}
                      <td className={styles.colHideDesktop} style={{ textAlign: "center", padding: "0 8px" }}>
                        <svg
                          className={`${styles.rowChevron} ${isOpen ? styles.rowChevronUp : ""}`}
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </td>
                    </tr>

                    {/* Detail row — only shown on mobile (≤600px) when expanded */}
                    {isOpen && (
                      <tr key={`detail-${c.id}`} className={styles.detailRowWrapper}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div className={styles.rowDetail}>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Email</span>
                              <span className={styles.detailValue}>{c.email ?? "—"}</span>
                            </div>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Phone</span>
                              <span className={styles.detailValue}>
                                <a href={`tel:${c.phone}`} style={{ color: "var(--terracotta)", textDecoration: "none" }}>{c.phone}</a>
                              </span>
                            </div>
                            <div className={styles.detailRow}>
                              <span className={styles.detailLabel}>Joined</span>
                              <span className={styles.detailValue}>{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

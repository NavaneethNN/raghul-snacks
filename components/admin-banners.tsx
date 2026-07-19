"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

export function AdminBanners() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [imageInputType, setImageInputType] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview] = useState<string>("");

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }


  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Banner Management</p>
          <h1>Homepage Banners</h1>
          <p>Manage promotional banners and hero images.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Banner
        </button>
      </header>

      <section className={styles.workspace}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Banner Title</th>
                <th>Link</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className={styles.emptyState}>
                  <div>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <path d="M21 15l-5-5L5 21"></path>
                    </svg>
                    <h3>No banners yet</h3>
                    <p>Create promotional banners for your homepage.</p>
                    <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                      Add Banner
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
              <h2>Add Banner</h2>
              <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form}>
              <div className={styles.field}>
                <label>Banner Title</label>
                <input type="text" placeholder="e.g., Summer Sale" required />
              </div>
              <div className={styles.field}>
                <label>Banner Image</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={() => { setImageInputType("url"); setImagePreview(""); }}
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      border: "1.5px solid var(--line)",
                      background: imageInputType === "url" ? "var(--terracotta)" : "var(--paper)",
                      color: imageInputType === "url" ? "white" : "var(--ink)",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputType("file")}
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      border: "1.5px solid var(--line)",
                      background: imageInputType === "file" ? "var(--terracotta)" : "var(--paper)",
                      color: imageInputType === "file" ? "white" : "var(--ink)",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Upload File
                  </button>
                </div>
                {imageInputType === "url" ? (
                  <input type="text" placeholder="https://..." required />
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ marginBottom: "8px" }}
                      required
                    />
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ maxWidth: "300px", maxHeight: "200px", borderRadius: "8px", marginTop: "8px" }}
                      />
                    )}
                  </>
                )}
              </div>
              <div className={styles.field}>
                <label>Link URL</label>
                <input type="text" placeholder="/shop or https://..." />
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
                  Add Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

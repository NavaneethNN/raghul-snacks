"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

type Category = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  createdAt: Date;
  productCount: number;
};

export function AdminCategories({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      image: formData.get("image") as string,
    };

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create category");
      }

      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete category");

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    }
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
              {categories.length === 0 ? (
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
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td><strong>{category.name}</strong></td>
                    <td><code style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", fontSize: "13px" }}>{category.slug}</code></td>
                    <td>{category.productCount} products</td>
                    <td>{new Date(category.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDelete(category.id)}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: "12px", background: "#fee2e2", border: "1px solid #dc2626", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>
                  {error}
                </div>
              )}
              <div className={styles.field}>
                <label>Category Name</label>
                <input type="text" name="name" placeholder="e.g., Laddus" required />
              </div>
              <div className={styles.field}>
                <label>Slug (URL-friendly name)</label>
                <input type="text" name="slug" placeholder="e.g., laddus" required />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Used in URLs. Only lowercase letters, numbers, and hyphens.</small>
              </div>
              <div className={styles.field}>
                <label>Category Image URL</label>
                <input type="text" name="image" placeholder="https://..." />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? "Adding..." : "Add Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

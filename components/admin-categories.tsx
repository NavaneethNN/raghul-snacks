"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image: string | null;
  createdAt: Date;
  productCount: number;
};

export function AdminCategories({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageInputType, setImageInputType] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview] = useState<string>("");

  function handleEdit(category: Category) {
    setEditingCategory(category);
    setShowForm(true);
    setImageInputType(category.image?.startsWith("data:") ? "file" : "url");
    setImagePreview(category.image || "");
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingCategory(null);
    setImagePreview("");
    setError("");
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    let imageUrl = "";
    if (imageInputType === "url") {
      imageUrl = formData.get("imageUrl") as string;
    } else if (imagePreview) {
      imageUrl = imagePreview; // Base64 data URL
    }

    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      image: imageUrl,
    };

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : "/api/admin/categories";
      const method = editingCategory ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to ${editingCategory ? 'update' : 'create'} category`);
      }

      handleCloseForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingCategory ? 'update' : 'create'} category`);
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
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Category
        </button>
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
                          onClick={() => handleEdit(category)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
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
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button className={styles.closeButton} onClick={handleCloseForm}>
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
                <input type="text" name="name" placeholder="e.g., Laddus" defaultValue={editingCategory?.name} required />
              </div>
              <div className={styles.field}>
                <label>Slug (URL-friendly name)</label>
                <input type="text" name="slug" placeholder="e.g., laddus" defaultValue={editingCategory?.slug} required />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Used in URLs. Only lowercase letters, numbers, and hyphens.</small>
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea name="description" rows={3} placeholder="Brief description of this category..." defaultValue={editingCategory?.description || ""}></textarea>
              </div>
              <div className={styles.field}>
                <label>Category Image</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setImageInputType("url")}
                    style={{
                      padding: '8px 16px',
                      background: imageInputType === "url" ? 'var(--terracotta)' : 'var(--cream)',
                      color: imageInputType === "url" ? 'white' : 'var(--ink)',
                      border: `1.5px solid ${imageInputType === "url" ? 'var(--terracotta)' : 'var(--line)'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputType("file")}
                    style={{
                      padding: '8px 16px',
                      background: imageInputType === "file" ? 'var(--terracotta)' : 'var(--cream)',
                      color: imageInputType === "file" ? 'white' : 'var(--ink)',
                      border: `1.5px solid ${imageInputType === "file" ? 'var(--terracotta)' : 'var(--line)'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Upload File
                  </button>
                </div>
                {imageInputType === "url" ? (
                  <input type="text" name="imageUrl" placeholder="https://..." />
                ) : (
                  <>
                    <input
                      type="file"
                      name="imageFile"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{
                        padding: '10px',
                        border: '1.5px solid var(--line)',
                        borderRadius: '8px',
                        background: 'var(--cream)',
                        fontSize: '14px',
                      }}
                    />
                    {imagePreview && (
                      <div style={{ marginTop: '12px' }}>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={handleCloseForm}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? (editingCategory ? "Updating..." : "Adding...") : (editingCategory ? "Update Category" : "Add Category")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

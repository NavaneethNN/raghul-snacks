"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  ingredients: string | null;
  price: string;
  offerPrice: string | null;
  weight: string;
  categoryId: number | null;
  categoryName: string | null;
  image: string | null;
  stock: number;
  featured: boolean;
  bestseller: boolean;
  createdAt: Date;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  createdAt: Date;
};

export function AdminProducts({ products, categories }: { products: Product[]; categories: Category[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
      description: formData.get("description") as string,
      ingredients: formData.get("ingredients") as string,
      price: parseFloat(formData.get("price") as string),
      offerPrice: formData.get("offerPrice") ? parseFloat(formData.get("offerPrice") as string) : null,
      weight: formData.get("weight") as string,
      categoryId: formData.get("categoryId") ? parseInt(formData.get("categoryId") as string) : null,
      image: formData.get("image") as string,
      stock: parseInt(formData.get("stock") as string),
      featured: formData.get("featured") === "on",
      bestseller: formData.get("bestseller") === "on",
    };

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create product");
      }

      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete product");

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product");
    }
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

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
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
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
              {filteredProducts.length === 0 ? (
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
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <br />
                      <small style={{ color: "#6b7280" }}>{product.weight}</small>
                    </td>
                    <td>{product.categoryName || "—"}</td>
                    <td>
                      {product.offerPrice ? (
                        <>
                          <strong>{price.format(Number(product.offerPrice))}</strong>
                          <br />
                          <small style={{ color: "#6b7280", textDecoration: "line-through" }}>
                            {price.format(Number(product.price))}
                          </small>
                        </>
                      ) : (
                        <strong>{price.format(Number(product.price))}</strong>
                      )}
                    </td>
                    <td>
                      {product.stock > 10 ? (
                        <span className={`${styles.badge} ${styles.success}`}>In Stock ({product.stock})</span>
                      ) : product.stock > 0 ? (
                        <span className={`${styles.badge} ${styles.warning}`}>Low ({product.stock})</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.error}`}>Out of Stock</span>
                      )}
                    </td>
                    <td>
                      {product.featured && <span className={`${styles.badge} ${styles.info}`}>Featured</span>}
                      {product.bestseller && <span className={`${styles.badge} ${styles.success}`}>Bestseller</span>}
                      {!product.featured && !product.bestseller && "—"}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDelete(product.id)}
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
              <h2>Add New Product</h2>
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
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Product Name</label>
                  <input type="text" name="name" placeholder="e.g., Thinai Laddu" required />
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <select name="categoryId">
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Price (₹)</label>
                  <input type="number" name="price" step="0.01" placeholder="0.00" required />
                </div>
                <div className={styles.field}>
                  <label>Offer Price (₹)</label>
                  <input type="number" name="offerPrice" step="0.01" placeholder="Optional" />
                </div>
                <div className={styles.field}>
                  <label>Weight</label>
                  <input type="text" name="weight" placeholder="e.g., 250g" required />
                </div>
                <div className={styles.field}>
                  <label>Stock Quantity</label>
                  <input type="number" name="stock" placeholder="0" required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea name="description" rows={4} placeholder="Product description..." required></textarea>
              </div>
              <div className={styles.field}>
                <label>Ingredients</label>
                <textarea name="ingredients" rows={3} placeholder="List ingredients..."></textarea>
              </div>
              <div className={styles.field}>
                <label>Image URL</label>
                <input type="text" name="image" placeholder="https://..." />
              </div>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="featured" />
                  <span>Featured Product</span>
                </label>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="bestseller" />
                  <span>Bestseller</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

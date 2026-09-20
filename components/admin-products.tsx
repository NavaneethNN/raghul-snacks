"use client";

import { useState } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { useRouter } from "next/navigation";
import { formatWeight } from "@/lib/catalog";
import styles from "./admin-table.module.css";
import productStyles from "./admin-products.module.css";

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageInputType, setImageInputType] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageData, setImageData] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [productSlug, setProductSlug] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setImagePreview(b64);
        setImageData(b64);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setProductName(product.name);
    setProductSlug(product.slug);
    setShowForm(true);
    setImageInputType(product.image?.startsWith("data:") ? "file" : "url");
    setImagePreview(product.image || "");
    setImageData(product.image || "");
    setError("");
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingProduct(null);
    setProductName("");
    setProductSlug("");
    setImagePreview("");
    setImageData("");
    setError("");
  }

  function handleNameChange(name: string) {
    setProductName(name);
    setProductSlug(
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const imageValue = imageInputType === "file" ? imageData : (formData.get("image") as string);

    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      ingredients: formData.get("ingredients") as string,
      price: parseFloat(formData.get("price") as string),
      offerPrice: formData.get("offerPrice") ? parseFloat(formData.get("offerPrice") as string) : null,
      weight: formData.get("weight") as string,
      categoryId: formData.get("categoryId") ? parseInt(formData.get("categoryId") as string) : null,
      image: imageValue,
      featured: formData.get("featured") === "on",
      bestseller: formData.get("bestseller") === "on",
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = editingProduct ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || `Failed to ${editingProduct ? "update" : "create"} product`);
      }
      handleCloseForm();
      showToast(editingProduct ? `"${data.name}" updated successfully` : `"${data.name}" added to catalog`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingProduct ? "update" : "create"} product`);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    if (confirmDeleteId === null) return;
    setDeleting(true);
    const name = products.find((p) => p.id === confirmDeleteId)?.name ?? "Product";
    try {
      const res = await fetch(`/api/admin/products/${confirmDeleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      setConfirmDeleteId(null);
      showToast(`"${name}" deleted`);
      router.refresh();
    } catch (err) {
      setConfirmDeleteId(null);
      showToast(err instanceof Error ? err.message : "Failed to delete product", false);
    } finally {
      setDeleting(false);
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

  return (
    <div className={styles.page}>
      {/* ── Toast ── */}
      {toast && (
        <div className={`${productStyles.toast} ${toast.ok ? productStyles.toastOk : productStyles.toastError}`}>
          {toast.ok
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Product Management</p>
          <h1>Products</h1>
          <p>Add, edit, and manage your product catalog.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Product
        </button>
        <AdminHeaderActions />
      </header>

      {/* ── Table ── */}
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
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th className={productStyles.hideOnMobile}>Category</th>
                <th>Price</th>
                <th className={productStyles.hideOnMobile}>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="8" r="6"></circle>
                        <path d="M15.5 13.5c-1.5-1-3.5-1-5 0"></path>
                      </svg>
                      <h3>No products yet</h3>
                      <p>Add your first product to get started.</p>
                      <button className={styles.primaryButton} onClick={() => setShowForm(true)}>Add Product</button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong><br />
                      <small style={{ color: "#6b7280" }}>{formatWeight(product.weight)}</small>
                      {/* Show category + status inline on mobile */}
                      <div className={productStyles.mobileSubtext}>
                        {product.categoryName && <span>{product.categoryName}</span>}
                        {product.featured   && <span className={productStyles.mobileBadge}>Featured</span>}
                        {product.bestseller && <span className={productStyles.mobileBadge}>Bestseller</span>}
                      </div>
                    </td>
                    <td className={productStyles.hideOnMobile}>{product.categoryName ?? "—"}</td>
                    <td>
                      {product.offerPrice ? (
                        <>
                          <strong>{fmt.format(Number(product.offerPrice))}</strong><br />
                          <small style={{ color: "#6b7280", textDecoration: "line-through" }}>
                            {fmt.format(Number(product.price))}
                          </small>
                        </>
                      ) : (
                        <strong>{fmt.format(Number(product.price))}</strong>
                      )}
                    </td>
                    <td className={productStyles.hideOnMobile}>
                      {product.featured   && <span className={`${styles.badge} ${styles.info}`}>Featured</span>}
                      {product.bestseller && <span className={`${styles.badge} ${styles.success}`} style={{ marginLeft: product.featured ? 6 : 0 }}>Bestseller</span>}
                      {!product.featured && !product.bestseller && "—"}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button className={styles.iconButton} onClick={() => handleEdit(product)} title="Edit product">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className={`${styles.iconButton} ${productStyles.deleteBtn}`}
                          onClick={() => setConfirmDeleteId(product.id)}
                          title="Delete product"
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

      {/* ── Inline delete confirmation dialog ── */}
      {confirmDeleteId !== null && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${productStyles.confirmDialog}`}>
            <div className={productStyles.confirmIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </div>
            <h3>Delete product?</h3>
            <p>
              <strong>&ldquo;{products.find((p) => p.id === confirmDeleteId)?.name}&rdquo;</strong> will be
              permanently removed from your catalog. This cannot be undone.
            </p>
            <div className={productStyles.confirmActions}>
              <button className={styles.secondaryButton} onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                Cancel
              </button>
              <button className={productStyles.dangerButton} onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>
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
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Product Name</label>
                  <input type="text" name="name" placeholder="e.g., Thinai Laddu" value={productName} onChange={(e) => handleNameChange(e.target.value)} required />
                </div>
                <div className={styles.field}>
                  <label>Slug (URL)</label>
                  <input type="text" name="slug" placeholder="e.g., thinai-laddu" value={productSlug} onChange={(e) => setProductSlug(e.target.value)} required />
                  <small style={{ color: "#6b7280", fontSize: "12px" }}>Auto-generated from name</small>
                </div>
                <div className={styles.field}>
                  <label>Category</label>
                  <select name="categoryId" defaultValue={editingProduct?.categoryId ?? ""}>
                    <option value="">Select category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Price (₹)</label>
                  <input type="number" name="price" step="0.01" min="0" placeholder="0.00" defaultValue={editingProduct?.price} required />
                </div>
                <div className={styles.field}>
                  <label>Offer Price (₹) <small style={{ color: "#9ca3af", fontWeight: 400 }}>optional</small></label>
                  <input type="number" name="offerPrice" step="0.01" min="0" placeholder="Leave blank if no discount" defaultValue={editingProduct?.offerPrice ?? ""} />
                </div>
                <div className={styles.field}>
                  <label>Weight</label>
                  <input type="text" name="weight" placeholder="e.g., 250g" defaultValue={editingProduct?.weight} required />
                </div>
              </div>
              <div className={styles.field}>
                <label>Description</label>
                <textarea name="description" rows={4} placeholder="Product description…" defaultValue={editingProduct?.description} required></textarea>
              </div>
              <div className={styles.field}>
                <label>Ingredients</label>
                <textarea name="ingredients" rows={3} placeholder="List ingredients…" defaultValue={editingProduct?.ingredients ?? ""}></textarea>
              </div>
              <div className={styles.field}>
                <label>Product Image</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  {(["url", "file"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setImageInputType(type); if (type === "url") { setImagePreview(""); setImageData(""); } }}
                      style={{
                        padding: "6px 14px", fontSize: "13px",
                        border: "1.5px solid var(--line)",
                        background: imageInputType === type ? "var(--terracotta)" : "var(--paper)",
                        color: imageInputType === type ? "white" : "var(--ink)",
                        borderRadius: "6px", cursor: "pointer",
                      }}
                    >
                      {type === "url" ? "URL" : "Upload File"}
                    </button>
                  ))}
                </div>
                {imageInputType === "url" ? (
                  <input type="text" name="image" placeholder="https://…" defaultValue={editingProduct?.image?.startsWith("data:") ? "" : (editingProduct?.image ?? "")} />
                ) : (
                  <>
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginBottom: "8px" }} />
                    {imagePreview && (
                      <div style={{ position: "relative", display: "inline-block", marginTop: "8px", borderRadius: "8px", overflow: "hidden" }}>
                        <img src={imagePreview} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px", display: "block" }} />
                        <button
                          type="button"
                          onClick={() => { setImagePreview(""); setImageData(""); }}
                          className={styles.imageDeleteButton}
                          title="Remove image"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="featured" defaultChecked={editingProduct?.featured} />
                  <span>Featured Product</span>
                </label>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="bestseller" defaultChecked={editingProduct?.bestseller} />
                  <span>Bestseller</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? (editingProduct ? "Updating…" : "Adding…") : (editingProduct ? "Update Product" : "Add Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

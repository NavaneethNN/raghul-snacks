"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminHeaderActions } from "./admin-header-actions";
import styles from "./admin-table.module.css";

type Product = {
  id: number;
  name: string;
  price: string;
  image: string | null;
};

type ComboItem = {
  productId: number;
  quantity: number;
};

type Combo = {
  id: number;
  title: string;
  slug: string;
  price: string;
  discount: string;
  image: string | null;
  createdAt: Date;
  items?: Array<{ id: number; productId: number; quantity: number; productName: string }>;
};

export function AdminCombos() {
  const router = useRouter();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    price: "",
    discount: "",
    image: "",
  });
  const [selectedItems, setSelectedItems] = useState<ComboItem[]>([]);

  useEffect(() => {
    fetchCombos();
    fetchProducts();
  }, []);

  async function fetchCombos() {
    try {
      const response = await fetch("/api/admin/combos");
      if (!response.ok) throw new Error("Failed to fetch combos");
      const data = await response.json();
      setCombos(data);
    } catch (error) {
      console.error("Error fetching combos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  function handleInputChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");

    // Auto-generate slug from title
    if (field === "title") {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormData((prev) => ({ ...prev, slug }));
    }
  }

  function addProduct(productId: number) {
    if (selectedItems.find(item => item.productId === productId)) {
      setError("Product already added to combo");
      return;
    }
    setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
    setError("");
  }

  function removeProduct(productId: number) {
    setSelectedItems(selectedItems.filter(item => item.productId !== productId));
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity < 1) return;
    setSelectedItems(selectedItems.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    ));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    // Validation
    if (!formData.title.trim()) {
      setError("Combo title is required");
      setFormLoading(false);
      return;
    }
    if (!formData.slug.trim()) {
      setError("Slug is required");
      setFormLoading(false);
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Valid price is required");
      setFormLoading(false);
      return;
    }
    if (selectedItems.length === 0) {
      setError("Please add at least one product to the combo");
      setFormLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          price: parseFloat(formData.price),
          discount: formData.discount ? parseFloat(formData.discount) : 0,
          image: formData.image || null,
          items: selectedItems,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create combo");
      }

      // Reset form and refresh
      setFormData({ title: "", slug: "", price: "", discount: "", image: "" });
      setSelectedItems([]);
      setShowForm(false);
      fetchCombos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create combo");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this combo?")) return;

    try {
      const response = await fetch(`/api/admin/combos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete combo");

      fetchCombos();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete combo");
    }
  }

  const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    <div>
                      <p>Loading combos...</p>
                    </div>
                  </td>
                </tr>
              ) : combos.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
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
              ) : (
                combos.map((combo) => (
                  <tr key={combo.id}>
                    <td>
                      <strong>{combo.title}</strong>
                      <br />
                      <code style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", color: "#6b7280" }}>
                        {combo.slug}
                      </code>
                    </td>
                    <td>
                      {combo.items && combo.items.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {combo.items.map((item) => (
                            <span key={item.id} style={{ fontSize: "13px", color: "#6b7280" }}>
                              {item.productName} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af", fontSize: "13px" }}>No products</span>
                      )}
                    </td>
                    <td><strong>{price.format(Number(combo.price))}</strong></td>
                    <td>
                      {Number(combo.discount) > 0 ? (
                        <span className={`${styles.badge} ${styles.success}`}>
                          {price.format(Number(combo.discount))} off
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDelete(combo.id)}
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
              <h2>Create Product Combo</h2>
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
                <label>Combo Title</label>
                <input
                  type="text"
                  placeholder="e.g., Millet Starter Box"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Slug (URL-friendly name)</label>
                <input
                  type="text"
                  placeholder="e.g., millet-starter-box"
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value)}
                  required
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>Auto-generated from title</small>
              </div>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Discount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.discount}
                    onChange={(e) => handleInputChange("discount", e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label>Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.image}
                  onChange={(e) => handleInputChange("image", e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Products in Combo</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <select
                    style={{ flex: 1, border: "1.5px solid #d1d5db", background: "#fff", padding: "10px 14px", fontSize: "14px", borderRadius: "8px" }}
                    onChange={(e) => {
                      if (e.target.value) {
                        addProduct(parseInt(e.target.value));
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Select a product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {price.format(Number(product.price))}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedItems.length > 0 && (
                  <div style={{ border: "1.5px solid #d1d5db", borderRadius: "8px", padding: "12px", background: "#fafbfc" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedItems.map((item) => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px", background: "#fff", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
                              {product?.name}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280" }}>
                                Qty:
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                  style={{ width: "60px", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", textAlign: "center" }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeProduct(item.productId)}
                                style={{ background: "#fee2e2", border: "1px solid #dc2626", color: "#991b1b", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedItems.length === 0 && (
                  <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>
                    No products added yet. Select products from the dropdown above.
                  </p>
                )}
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={formLoading}>
                  {formLoading ? "Creating..." : "Create Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

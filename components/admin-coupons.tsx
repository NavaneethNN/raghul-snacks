"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-table.module.css";

type Coupon = {
  id: number;
  code: string;
  name: string | null;
  description: string | null;
  discountType: string;
  value: string;
  maxDiscount: string | null;
  minOrderValue: string;
  validFrom: string | null;
  validUntil: string | null;
  totalUsage: number | null;
  perCustomer: number | null;
  applicableProducts: string[] | null;
  applicableCategories: string[] | null;
  applyTo: string | null;
  firstPurchase: boolean;
  publicCoupon: boolean;
  notes: string | null;
  active: boolean;
  createdAt: Date;
};

export function AdminCoupons() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "percentage",
    value: "",
    maxDiscount: "",
    minOrderValue: "0",
    validFrom: "",
    validUntil: "",
    totalUsage: "",
    perCustomer: "",
    applicableProducts: [] as string[],
    applicableCategories: [] as string[],
    applyTo: "entire_store",
    firstPurchase: false,
    publicCoupon: true,
    notes: "",
    active: true,
  });

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function fetchCoupons() {
    try {
      const response = await fetch("/api/admin/coupons");
      if (!response.ok) throw new Error("Failed to fetch coupons");
      const data = await response.json();
      setCoupons(data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name || "",
      description: coupon.description || "",
      discountType: coupon.discountType,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount || "",
      minOrderValue: coupon.minOrderValue || "0",
      validFrom: coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : "",
      validUntil: coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : "",
      totalUsage: coupon.totalUsage?.toString() || "",
      perCustomer: coupon.perCustomer?.toString() || "",
      applicableProducts: coupon.applicableProducts || [],
      applicableCategories: coupon.applicableCategories || [],
      applyTo: coupon.applyTo || "entire_store",
      firstPurchase: coupon.firstPurchase || false,
      publicCoupon: coupon.publicCoupon !== undefined ? coupon.publicCoupon : true,
      notes: coupon.notes || "",
      active: coupon.active,
    });
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingCoupon(null);
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: "percentage",
      value: "",
      maxDiscount: "",
      minOrderValue: "0",
      validFrom: "",
      validUntil: "",
      totalUsage: "",
      perCustomer: "",
      applicableProducts: [],
      applicableCategories: [],
      applyTo: "entire_store",
      firstPurchase: false,
      publicCoupon: true,
      notes: "",
      active: true,
    });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    if (!formData.code.trim()) {
      setError("Coupon code is required");
      setFormLoading(false);
      return;
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      setError("Valid discount value is required");
      setFormLoading(false);
      return;
    }

    try {
      const url = editingCoupon
        ? `/api/admin/coupons/${editingCoupon.id}`
        : "/api/admin/coupons";
      const method = editingCoupon ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          name: formData.name || null,
          description: formData.description || null,
          discountType: formData.discountType,
          value: parseFloat(formData.value),
          maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
          minOrderValue: parseFloat(formData.minOrderValue) || 0,
          validFrom: formData.validFrom || null,
          validUntil: formData.validUntil || null,
          totalUsage: formData.totalUsage ? parseInt(formData.totalUsage) : null,
          perCustomer: formData.perCustomer ? parseInt(formData.perCustomer) : null,
          applicableProducts: formData.applicableProducts.length > 0 ? formData.applicableProducts : null,
          applicableCategories: formData.applicableCategories.length > 0 ? formData.applicableCategories : null,
          applyTo: formData.applyTo,
          firstPurchase: formData.firstPurchase,
          publicCoupon: formData.publicCoupon,
          notes: formData.notes || null,
          active: formData.active,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || `Failed to ${editingCoupon ? 'update' : 'create'} coupon`);
      }

      handleCloseForm();
      fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingCoupon ? 'update' : 'create'} coupon`);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete coupon");

      fetchCoupons();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete coupon");
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Discount Management</p>
          <h1>Coupons</h1>
          <p>Create and manage discount codes for your customers.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Coupon
        </button>
      </header>

      <section className={styles.workspace}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Discount Type</th>
                <th>Value</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <div>
                      <p>Loading coupons...</p>
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        <circle cx="9" cy="11" r="1"></circle>
                        <circle cx="15" cy="11" r="1"></circle>
                      </svg>
                      <h3>No coupons yet</h3>
                      <p>Create discount codes to attract customers.</p>
                      <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
                        Create Coupon
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <code style={{ background: "#f3f4f6", padding: "4px 8px", borderRadius: "4px", fontSize: "14px", fontWeight: 600 }}>
                        {coupon.code}
                      </code>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{coupon.discountType}</td>
                    <td>
                      <strong>
                        {coupon.discountType === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`}
                      </strong>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${coupon.active ? styles.success : ""}`} style={{ background: coupon.active ? "#d1fae5" : "#fee2e2", color: coupon.active ? "#065f46" : "#991b1b" }}>
                        {coupon.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>{new Date(coupon.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleEdit(coupon)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleDelete(coupon.id)}
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
              <h2>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h2>
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
              
              {/* Basic Information */}
              <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#374151" }}>Basic Information</h3>
                <div className={styles.field}>
                  <label>Coupon Code</label>
                  <input
                    type="text"
                    placeholder="e.g., WELCOME10"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    style={{ textTransform: "uppercase" }}
                  />
                </div>
                <div className={styles.field}>
                  <label>Coupon Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Welcome Offer"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Description</label>
                  <input
                    type="text"
                    placeholder="e.g., First order discount for new customers"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label>Status</label>
                  <select
                    value={formData.active ? "active" : "inactive"}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === "active" })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Discount */}
              <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#374151" }}>Discount</h3>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Discount Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                      required
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>{formData.discountType === "percentage" ? "Discount Percentage" : "Discount Amount"}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={formData.discountType === "percentage" ? "e.g., 20" : "e.g., 100"}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      required
                    />
                    <small style={{ color: "#6b7280", fontSize: "12px" }}>
                      {formData.discountType === "percentage" ? "Enter percentage value (e.g., 20 for 20%)" : "Enter fixed amount in rupees"}
                    </small>
                  </div>
                </div>
                {formData.discountType === "percentage" && (
                  <div className={styles.field}>
                    <label>Maximum Discount</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 500"
                      value={formData.maxDiscount}
                      onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    />
                    <small style={{ color: "#6b7280", fontSize: "12px" }}>Maximum discount amount for percentage-based coupons. Leave empty for no limit.</small>
                  </div>
                )}
              </div>

              {/* Validity */}
              <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#374151" }}>Validity</h3>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>End Date</label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Usage Limits */}
              <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#374151" }}>Usage Limits</h3>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Total Usage</label>
                    <input
                      type="number"
                      placeholder="e.g., 1000"
                      value={formData.totalUsage}
                      onChange={(e) => setFormData({ ...formData, totalUsage: e.target.value })}
                    />
                    <small style={{ color: "#6b7280", fontSize: "12px" }}>Total times this coupon can be used. Leave empty for unlimited.</small>
                  </div>
                  <div className={styles.field}>
                    <label>Per Customer</label>
                    <input
                      type="number"
                      placeholder="e.g., 1"
                      value={formData.perCustomer}
                      onChange={(e) => setFormData({ ...formData, perCustomer: e.target.value })}
                    />
                    <small style={{ color: "#6b7280", fontSize: "12px" }}>Times a single customer can use this coupon. Leave empty for unlimited.</small>
                  </div>
                </div>
                <div className={styles.field}>
                  <label>Minimum Order</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 999"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                  />
                  <small style={{ color: "#6b7280", fontSize: "12px" }}>Minimum order value required to use this coupon.</small>
                </div>
              </div>

              {/* Applicability */}
              <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#374151" }}>Applicability</h3>
                <div className={styles.field}>
                  <label>Apply To</label>
                  <select
                    value={formData.applyTo}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setFormData({ 
                        ...formData, 
                        applyTo: newValue,
                        applicableCategories: newValue === "categories" ? formData.applicableCategories : [],
                        applicableProducts: newValue === "products" ? formData.applicableProducts : []
                      });
                    }}
                  >
                    <option value="entire_store">Entire Store</option>
                    <option value="categories">Specific Categories</option>
                    <option value="products">Specific Products</option>
                  </select>
                </div>
                {formData.applyTo === "categories" && (
                  <div className={styles.field}>
                    <label>Category</label>
                    <select
                      value={formData.applicableCategories[0] || ""}
                      onChange={(e) => setFormData({ ...formData, applicableCategories: e.target.value ? [e.target.value] : [] })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1.5px solid var(--line)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "white",
                      }}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: "#6b7280", fontSize: "12px" }}>Select the category to apply this coupon to.</small>
                  </div>
                )}
                {formData.applyTo === "products" && (
                  <div className={styles.field}>
                    <label>Product</label>
                    <select
                      value={formData.applicableProducts[0] || ""}
                      onChange={(e) => setFormData({ ...formData, applicableProducts: e.target.value ? [e.target.value] : [] })}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1.5px solid var(--line)",
                        borderRadius: "8px",
                        fontSize: "14px",
                        background: "white",
                      }}
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.slug}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: "#6b7280", fontSize: "12px" }}>Select the product to apply this coupon to.</small>
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <div style={{ marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#374151" }}>Advanced Settings</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.firstPurchase}
                      onChange={(e) => setFormData({ ...formData, firstPurchase: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span>First Purchase Only</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.publicCoupon}
                      onChange={(e) => setFormData({ ...formData, publicCoupon: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span>Public Coupon (visible to customers)</span>
                  </label>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={handleCloseForm}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={formLoading}>
                  {formLoading ? (editingCoupon ? "Updating..." : "Creating...") : (editingCoupon ? "Update Coupon" : "Create Coupon")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

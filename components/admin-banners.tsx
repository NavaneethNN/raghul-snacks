"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./admin-table.module.css";

type Banner = {
  id: number;
  eyebrow: string;
  title: string;
  subtitle: string | null;
  offerText: string | null;
  couponCode: string | null;
  buttonText: string;
  validityText: string | null;
  image: string | null;
  href: string;
  active: boolean;
  createdAt: string;
};

type Coupon = {
  id: number;
  code: string;
  discountType: string;
  value: string;
};

const initialForm = {
  eyebrow: "",
  title: "",
  subtitle: "",
  offerText: "",
  couponCode: "",
  buttonText: "Shop Now",
  validityText: "",
  image: "",
  href: "/shop",
  active: true,
};

export function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [imageInputType, setImageInputType] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [form, setForm] = useState(initialForm);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons || []);
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    fetchCoupons();
  }, [fetchBanners, fetchCoupons]);

  function openAdd() {
    setEditingId(null);
    setForm(initialForm);
    setImageInputType("url");
    setImagePreview("");
    setShowForm(true);
  }

  function openEdit(banner: Banner) {
    setEditingId(banner.id);
    setForm({
      eyebrow: banner.eyebrow || "",
      title: banner.title,
      subtitle: banner.subtitle || "",
      offerText: banner.offerText || "",
      couponCode: banner.couponCode || "",
      buttonText: banner.buttonText || "Shop Now",
      validityText: banner.validityText || "",
      image: banner.image || "",
      href: banner.href || "/shop",
      active: banner.active,
    });
    setImagePreview(banner.image || "");
    setImageInputType(banner.image ? "url" : "url");
    setShowForm(true);
  }

  async function saveBanner(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/banners/${editingId}` : "/api/banners";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          image: imageInputType === "file" ? imagePreview : form.image,
          active: form.active,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        fetchBanners();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save banner");
      }
    } catch (error) {
      console.error("Error saving banner:", error);
      alert("Failed to save banner");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBanner(id: number) {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBanners();
      } else {
        alert("Failed to delete banner");
      }
    } catch (error) {
      console.error("Error deleting banner:", error);
      alert("Failed to delete banner");
    }
  }

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
        <button className={styles.primaryButton} onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Banner
        </button>
      </header>

      <section className={styles.workspace}>
        <div className={styles.tableWrapper}>
          {loading ? (
            <p style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading banners...</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Coupon</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
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
                        <button className={styles.primaryButton} onClick={openAdd}>
                          Add Banner
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  banners.map((banner) => (
                    <tr key={banner.id}>
                      <td>
                        <strong>{banner.title}</strong>
                        {banner.eyebrow && <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{banner.eyebrow}</p>}
                      </td>
                      <td>{banner.couponCode || "—"}</td>
                      <td>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: banner.active ? "#dcfce7" : "#fee2e2",
                            color: banner.active ? "#166534" : "#991b1b",
                          }}
                        >
                          {banner.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{new Date(banner.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className={styles.secondaryButton} onClick={() => openEdit(banner)}>
                            Edit
                          </button>
                          <button
                            className={styles.secondaryButton}
                            style={{ color: "#dc2626" }}
                            onClick={() => deleteBanner(banner.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ maxWidth: "650px" }}>
            <div className={styles.modalHeader}>
              <h2>{editingId ? "Edit Banner" : "Add Banner"}</h2>
              <button className={styles.closeButton} onClick={() => setShowForm(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form className={styles.form} onSubmit={saveBanner}>
              <div className={styles.field}>
                <label>Eyebrow Text (small label)</label>
                <input
                  type="text"
                  value={form.eyebrow}
                  onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                  placeholder="e.g., FESTIVE OFFER"
                />
              </div>
              <div className={styles.field}>
                <label>Main Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Flat 15% OFF"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Subtitle</label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="e.g., on all orders above ₹999"
                />
              </div>
              <div className={styles.field}>
                <label>Offer Text (used below coupon code)</label>
                <input
                  type="text"
                  value={form.offerText}
                  onChange={(e) => setForm({ ...form, offerText: e.target.value })}
                  placeholder="e.g., Use Code: FESTIVE15"
                />
              </div>
              <div className={styles.field}>
                <label>Coupon Code</label>
                <select
                  value={form.couponCode}
                  onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1.5px solid var(--line)",
                    borderRadius: "8px",
                    fontSize: "14px",
                    background: "white",
                  }}
                >
                  <option value="">Select a coupon (optional)</option>
                  {coupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.code}>
                      {coupon.code} — {coupon.discountType === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`} off
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Button Text</label>
                <input
                  type="text"
                  value={form.buttonText}
                  onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                  placeholder="e.g., Shop Now"
                />
              </div>
              <div className={styles.field}>
                <label>Validity Text</label>
                <input
                  type="text"
                  value={form.validityText}
                  onChange={(e) => setForm({ ...form, validityText: e.target.value })}
                  placeholder="e.g., Offer valid till 15 Aug 2026"
                />
              </div>
              <div className={styles.field}>
                <label>Button Link</label>
                <input
                  type="text"
                  value={form.href}
                  onChange={(e) => setForm({ ...form, href: e.target.value })}
                  placeholder="/shop or https://..."
                />
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
                </div>
                {imageInputType === "url" ? (
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => { setForm({ ...form, image: e.target.value }); setImagePreview(e.target.value); }}
                    placeholder="https://..."
                  />
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ marginBottom: "8px" }}
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
              {imagePreview && (
                <div className={styles.field}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: "300px", maxHeight: "200px", borderRadius: "8px" }}
                  />
                </div>
              )}
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Banner" : "Add Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

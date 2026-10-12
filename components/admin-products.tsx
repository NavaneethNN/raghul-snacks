"use client";

import { useState, useEffect } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { useRouter } from "next/navigation";
import { formatWeight } from "@/lib/catalog";
import styles from "./admin-table.module.css";
import productStyles from "./admin-products.module.css";

type Variant = { id: number; weight: string; price: string; offerPrice: string | null; sortOrder: number; active: boolean };
// Draft variant (before saving to DB)
type DraftVariant = { key: string; label: string; price: string; offerPrice: string };

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
  stock: number;
  variantCount?: number;
  createdAt: Date;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  createdAt: Date;
};

const VARIANT_TYPES = ["Weight", "Variety", "Flavour", "Size", "Pack"] as const;
type VariantType = typeof VARIANT_TYPES[number];

const VARIANT_PLACEHOLDERS: Record<VariantType, string> = {
  Weight: "e.g. 250g",
  Variety: "e.g. Chocolate",
  Flavour: "e.g. Mango",
  Size:    "e.g. Small",
  Pack:    "e.g. Pack of 6",
};

export function AdminProducts({ products, categories }: { products: Product[]; categories: Category[] }) {
  const router = useRouter();
  const [showForm, setShowForm]             = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState("");
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [imageInputType, setImageInputType] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview]     = useState<string>("");
  const [imageData, setImageData]           = useState<string>("");
  const [productName, setProductName]       = useState("");
  const [productSlug, setProductSlug]       = useState("");

  // ── Variant state ──────────────────────────────────────────────────────────
  // hasVariants: toggle on the form
  const [hasVariants, setHasVariants]       = useState(false);
  const [variantType, setVariantType]       = useState<VariantType>("Weight");
  // draftVariants: in-form list before saving to DB
  const [draftVariants, setDraftVariants]   = useState<DraftVariant[]>([]);
  const [draftLabel, setDraftLabel]         = useState("");
  const [draftPrice, setDraftPrice]         = useState("");
  const [draftOffer, setDraftOffer]         = useState("");
  // savedVariants: loaded from DB when editing
  const [savedVariants, setSavedVariants]   = useState<Variant[]>([]);
  const [variantSaving, setVariantSaving]   = useState(false);

  async function loadSavedVariants(productId: number) {
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`);
      if (res.ok) {
        const data = await res.json() as Variant[];
        setSavedVariants(data);
        setHasVariants(data.length > 0);
      }
    } catch { setSavedVariants([]); }
  }

  async function saveDraftVariantsToDb(productId: number) {
    for (let i = 0; i < draftVariants.length; i++) {
      const v = draftVariants[i];
      await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: v.label,
          price: parseFloat(v.price),
          offerPrice: v.offerPrice ? parseFloat(v.offerPrice) : null,
          sortOrder: i,
        }),
      });
    }
  }

  async function syncProductPriceFromVariants(productId: number) {
    // After any variant change, sync product's price/weight from first variant
    try {
      const res = await fetch(`/api/admin/products/${productId}/variants`);
      if (!res.ok) return;
      const vars = await res.json() as Variant[];
      if (vars.length === 0) return;
      const first = vars[0];
      await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: parseFloat(first.price),
          offerPrice: first.offerPrice ? parseFloat(first.offerPrice) : null,
          weight: first.weight,
        }),
      });
    } catch { /* non-critical */ }
  }

  async function deleteSavedVariant(productId: number, variantId: number) {
    await fetch(`/api/admin/products/${productId}/variants/${variantId}`, { method: "DELETE" });
    await loadSavedVariants(productId);
    await syncProductPriceFromVariants(productId);
  }

  async function addSavedVariant(productId: number) {
    if (!draftLabel.trim() || !draftPrice) return;
    setVariantSaving(true);
    try {
      await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: draftLabel.trim(),
          price: parseFloat(draftPrice),
          offerPrice: draftOffer ? parseFloat(draftOffer) : null,
          sortOrder: savedVariants.length,
        }),
      });
      await loadSavedVariants(productId);
      await syncProductPriceFromVariants(productId);
      setDraftLabel(""); setDraftPrice(""); setDraftOffer("");
    } finally { setVariantSaving(false); }
  }

  function addDraftVariant() {
    if (!draftLabel.trim() || !draftPrice) return;
    setDraftVariants(prev => [...prev, { key: `${Date.now()}`, label: draftLabel.trim(), price: draftPrice, offerPrice: draftOffer }]);
    setDraftLabel(""); setDraftPrice(""); setDraftOffer("");
  }

  function removeDraftVariant(key: string) {
    setDraftVariants(prev => prev.filter(v => v.key !== key));
  }

  // ── General helpers ────────────────────────────────────────────────────────
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { const b64 = reader.result as string; setImagePreview(b64); setImageData(b64); };
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
    setDraftVariants([]);
    setSavedVariants([]);
    loadSavedVariants(product.id);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingProduct(null);
    setProductName(""); setProductSlug("");
    setImagePreview(""); setImageData("");
    setError("");
    setHasVariants(false);
    setVariantType("Weight");
    setDraftVariants([]);
    setSavedVariants([]);
    setDraftLabel(""); setDraftPrice(""); setDraftOffer("");
  }

  function handleNameChange(name: string) {
    setProductName(name);
    setProductSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const imageValue = imageInputType === "file" ? imageData : (formData.get("image") as string);

    // When hasVariants, use first draft variant's price as product base price
    // (or 0 as placeholder — the real prices live in variants)
    const firstDraft = draftVariants[0];
    const basePrice = hasVariants && firstDraft
      ? parseFloat(firstDraft.price)
      : parseFloat(formData.get("price") as string);
    const baseOffer = hasVariants && firstDraft && firstDraft.offerPrice
      ? parseFloat(firstDraft.offerPrice)
      : (formData.get("offerPrice") ? parseFloat(formData.get("offerPrice") as string) : null);
    const baseWeight = hasVariants && firstDraft ? firstDraft.label : (formData.get("weight") as string);

    if (hasVariants && draftVariants.length === 0 && !editingProduct) {
      setError("Add at least one variant before saving.");
      setLoading(false);
      return;
    }

    const data = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: formData.get("description") as string,
      ingredients: formData.get("ingredients") as string,
      price: isNaN(basePrice) ? 0 : basePrice,
      offerPrice: baseOffer,
      weight: baseWeight || "—",
      categoryId: formData.get("categoryId") ? parseInt(formData.get("categoryId") as string) : null,
      image: imageValue,
      featured: false,
      bestseller: formData.get("bestseller") === "on",
      stock: formData.get("inStock") === "on" ? 1 : 0,
      shelfLife: (formData.get("shelfLife") as string) || null,
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = editingProduct ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || `Failed to ${editingProduct ? "update" : "create"} product`);
      }
      const saved = await res.json() as Product;

      // Save draft variants to DB if any, then sync product price from first variant
      if (draftVariants.length > 0) {
        await saveDraftVariantsToDb(saved.id);
        // Sync product price/weight from first variant so product cards show correct price
        const first = draftVariants[0];
        await fetch(`/api/admin/products/${saved.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price: parseFloat(first.price),
            offerPrice: first.offerPrice ? parseFloat(first.offerPrice) : null,
            weight: first.label,
          }),
        });
      }

      if (!editingProduct) {
        if (hasVariants) {
          showToast(`"${data.name}" saved with ${draftVariants.length} variant${draftVariants.length > 1 ? "s" : ""}`);
          setEditingProduct(saved);
          setDraftVariants([]);
          await loadSavedVariants(saved.id);
        } else {
          handleCloseForm();
          showToast(`"${data.name}" added to catalog`);
        }
      } else {
        handleCloseForm();
        showToast(`"${data.name}" updated successfully`);
      }
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
      {/* Toast */}
      {toast && (
        <div className={`${productStyles.toast} ${toast.ok ? productStyles.toastOk : productStyles.toastError}`}>
          {toast.ok
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Product Management</p>
          <h1>Products</h1>
          <p>Add, edit, and manage your product catalog.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      {/* Stat banners */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, padding: "0 32px 24px" }}>
        {[
          { label: "Total Products", value: products.length, color: "#3b82f6" },
          { label: "In Stock", value: products.filter(p => p.stock !== 0).length, color: "#16a34a" },
          { label: "Out of Stock", value: products.filter(p => p.stock === 0).length, color: "#dc2626" },
          { label: "With Variants", value: products.filter(p => (p.variantCount ?? 0) > 0).length, color: "#c95f3b" },
          { label: "Bestsellers", value: products.filter(p => p.bestseller).length, color: "#9333ea" },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 18px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 600 }}>{stat.label}</p>
            <strong style={{ fontSize: 24, fontWeight: 700, color: stat.color, fontFamily: "'DM Sans',sans-serif" }}>{stat.value}</strong>
          </div>
        ))}
      </div>

      {/* Table */}
      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarSearch}>
            <span className={styles.searchIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input type="text" placeholder="Search products…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "36px" }} />
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
                <th className={productStyles.hideOnMobile}>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyState}><div><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5c-1.5-1-3.5-1-5 0"/></svg><h3>No products yet</h3><p>Add your first product to get started.</p><button className={styles.primaryButton} onClick={() => setShowForm(true)}>Add Product</button></div></td></tr>
              ) : filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong><br />
                    <small style={{ color: "#6b7280" }}>{formatWeight(product.weight)}</small>
                    <div className={productStyles.mobileSubtext}>
                      {product.categoryName && <span>{product.categoryName}</span>}
                      {product.bestseller && <span className={productStyles.mobileBadge}>Bestseller</span>}
                      {product.stock === 0 && <span className={productStyles.mobileBadge} style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>Out of Stock</span>}
                    </div>
                  </td>
                  <td className={productStyles.hideOnMobile}>{product.categoryName ?? "—"}</td>
                  <td>
                    {product.offerPrice
                      ? <><strong>{fmt.format(Number(product.offerPrice))}</strong><br /><small style={{ color: "#6b7280", textDecoration: "line-through" }}>{fmt.format(Number(product.price))}</small></>
                      : <strong>{fmt.format(Number(product.price))}</strong>}
                  </td>
                  <td className={productStyles.hideOnMobile}>
                    {product.stock === 0
                      ? <span className={`${styles.badge}`} style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626", border: "1px solid rgba(220,38,38,0.2)" }}>Out of Stock</span>
                      : <span className={`${styles.badge} ${styles.success}`}>In Stock</span>
                    }
                    {product.bestseller && <span className={`${styles.badge} ${styles.info}`} style={{ marginLeft: 6 }}>Bestseller</span>}
                  </td>
                  <td className={productStyles.hideOnMobile}>
                    {(product.variantCount ?? 0) > 0 ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2"/>
                          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                          <line x1="12" y1="12" x2="12" y2="17"/>
                          <line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
                        </svg>
                        {product.variantCount} variant{(product.variantCount ?? 0) !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: "#6b7280" }}>Single</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button className={styles.iconButton} onClick={() => handleEdit(product)} title="Edit product">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className={styles.iconButton} onClick={() => setConfirmDeleteId(product.id)} title="Delete product">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Delete confirm */}
      {confirmDeleteId !== null && (
        <div className={styles.modal}>
          <div className={`${styles.modalContent} ${productStyles.confirmDialog}`}>
            <div className={productStyles.confirmIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3>Delete product?</h3>
            <p><strong>&ldquo;{products.find((p) => p.id === confirmDeleteId)?.name}&rdquo;</strong> will be permanently removed. This cannot be undone.</p>
            <div className={productStyles.confirmActions}>
              <button className={styles.secondaryButton} onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</button>
              <button className={productStyles.dangerButton} onClick={confirmDelete} disabled={deleting}>{deleting ? "Deleting…" : "Yes, delete"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>
              <button className={styles.closeButton} onClick={handleCloseForm}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && (
                <div style={{ padding: "12px", background: "#fee2e2", border: "1px solid #dc2626", borderRadius: "8px", color: "#991b1b", marginBottom: "20px" }}>{error}</div>
              )}

              {/* ── Basic fields ── */}
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
              </div>

              {/* ── Has variants toggle ── */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "0 0 20px", cursor: "pointer", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => { setHasVariants(e.target.checked); setDraftVariants([]); }}
                  style={{ width: 18, height: 18, marginTop: 2, cursor: "pointer", accentColor: "var(--terracotta)", flexShrink: 0 }}
                />
                <div>
                  <span style={{ font: "600 14px 'DM Sans',sans-serif", color: "var(--ink)", display: "block" }}>Has variants</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>e.g. different weights or sizes with different prices</span>
                </div>
              </label>

              {/* ── Single price/weight (shown when NO variants) ── */}
              {!hasVariants && (
                <div className={styles.formGrid}>
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
              )}

              {/* ── Variant builder (shown when HAS variants) ── */}
              {hasVariants && (
                <div style={{ marginBottom: 20, padding: "16px", background: "var(--cream)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  {/* Variant type selector */}
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ display: "block", marginBottom: 8, font: "600 12px 'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.07em", color: "#6b7280" }}>Variant type</span>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {VARIANT_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setVariantType(t)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 6,
                            border: "1.5px solid var(--line)",
                            background: variantType === t ? "var(--ink)" : "var(--paper)",
                            color: variantType === t ? "#fff" : "var(--ink)",
                            font: "600 13px 'DM Sans',sans-serif",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Saved variants (when editing) */}
                  {editingProduct && savedVariants.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved variants</p>
                      {savedVariants.map(v => (
                        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--paper)", borderRadius: 7, border: "1px solid var(--line)", marginBottom: 5 }}>
                          <span style={{ flex: 1, font: "600 13px 'DM Sans',sans-serif" }}>{v.weight}</span>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>₹{v.price}{v.offerPrice ? ` → ₹${v.offerPrice}` : ""}</span>
                          <button type="button" className={styles.iconButton} onClick={() => deleteSavedVariant(editingProduct.id, v.id)} title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Draft variants (before save) */}
                  {draftVariants.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Added variants</p>
                      {draftVariants.map(v => (
                        <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--paper)", borderRadius: 7, border: "1px solid var(--line)", marginBottom: 5 }}>
                          <span style={{ flex: 1, font: "600 13px 'DM Sans',sans-serif" }}>{v.label}</span>
                          <span style={{ fontSize: 12, color: "#6b7280" }}>₹{v.price}{v.offerPrice ? ` → ₹${v.offerPrice}` : ""}</span>
                          <button type="button" className={styles.iconButton} onClick={() => removeDraftVariant(v.key)} title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add variant row */}
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Add a {variantType.toLowerCase()}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                    <div className={styles.field} style={{ flex: "1 1 100px", minWidth: 90 }}>
                      <label>{variantType}</label>
                      <input
                        type="text"
                        placeholder={VARIANT_PLACEHOLDERS[variantType]}
                        value={draftLabel}
                        onChange={(e) => setDraftLabel(e.target.value)}
                      />
                    </div>
                    <div className={styles.field} style={{ flex: "1 1 90px", minWidth: 80 }}>
                      <label>Price (₹)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value)} />
                    </div>
                    <div className={styles.field} style={{ flex: "1 1 90px", minWidth: 80 }}>
                      <label>Offer Price</label>
                      <input type="number" min="0" step="0.01" placeholder="Optional" value={draftOffer} onChange={(e) => setDraftOffer(e.target.value)} />
                    </div>
                    {editingProduct ? (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={variantSaving || !draftLabel.trim() || !draftPrice}
                        onClick={() => addSavedVariant(editingProduct.id)}
                        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        {variantSaving ? "Saving…" : `+ Add`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={!draftLabel.trim() || !draftPrice}
                        onClick={addDraftVariant}
                        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Description / Ingredients */}
              <div className={styles.field}>
                <label>Description</label>
                <textarea name="description" rows={4} placeholder="Product description…" defaultValue={editingProduct?.description} required></textarea>
              </div>
              <div className={styles.field}>
                <label>Ingredients</label>
                <textarea name="ingredients" rows={3} placeholder="List ingredients…" defaultValue={editingProduct?.ingredients ?? ""}></textarea>
              </div>
              <div className={styles.field}>
                <label>Shelf Life <small style={{ color: "#9ca3af", fontWeight: 400 }}>optional</small></label>
                <input type="text" name="shelfLife" placeholder="e.g., 30 days" defaultValue={(editingProduct as any)?.shelfLife ?? ""} />
              </div>

              {/* Image */}
              <div className={styles.field}>
                <label>Product Image</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  {(["url", "file"] as const).map((type) => (
                    <button key={type} type="button"
                      onClick={() => { setImageInputType(type); if (type === "url") { setImagePreview(""); setImageData(""); } }}
                      style={{ padding: "6px 14px", fontSize: "13px", border: "1.5px solid var(--line)", background: imageInputType === type ? "var(--terracotta)" : "var(--paper)", color: imageInputType === type ? "white" : "var(--ink)", borderRadius: "6px", cursor: "pointer" }}
                    >{type === "url" ? "URL" : "Upload File"}</button>
                  ))}
                </div>
                {imageInputType === "url"
                  ? <input type="text" name="image" placeholder="https://…" defaultValue={editingProduct?.image?.startsWith("data:") ? "" : (editingProduct?.image ?? "")} />
                  : (<>
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginBottom: "8px" }} />
                      {imagePreview && (
                        <div
                          style={{ position: "relative", display: "inline-block", marginTop: "8px" }}
                          className={productStyles.imagePreviewWrap}
                        >
                          <img
                            src={imagePreview}
                            alt="Preview"
                            style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px", display: "block", border: "1px solid var(--line)" }}
                          />
                          <button
                            type="button"
                            onClick={() => { setImagePreview(""); setImageData(""); }}
                            className={productStyles.imageDeleteButton}
                            title="Remove image"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      )}
                    </>)}
              </div>

              {/* Checkboxes */}
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="inStock" defaultChecked={(editingProduct as any)?.stock !== 0} />
                  <span>In Stock</span>
                </label>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="bestseller" defaultChecked={editingProduct?.bestseller} />
                  <span>Bestseller</span>
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.secondaryButton} onClick={handleCloseForm}>Cancel</button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? (editingProduct ? "Updating…" : "Saving…") : (editingProduct ? "Update Product" : "Save Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

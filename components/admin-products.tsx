"use client";

import React, { useState, useEffect } from "react";
import { AdminHeaderActions } from "./admin-header-actions";
import { useRouter } from "next/navigation";
import { formatWeight } from "@/lib/catalog";
import styles from "./admin-table.module.css";
import productStyles from "./admin-products.module.css";

type Variant = { id: number; weight: string; variantType?: "weight" | "pack" | null; approxWeight?: string | null; price: string; offerPrice: string | null; sortOrder: number; active: boolean };
// Draft variant (before saving to DB)
type DraftVariant = { key: string; variantType: "weight" | "pack"; label: string; approxWeight: string; price: string; offerPrice: string };

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
    active?: boolean;
  stock?: number;
  variantCount?: number;
  shelfLife?: string | null;
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
  const [tabFilter, setTabFilter]           = useState<"all" | "regular" | "combos">("all");
  const [statusFilter, setStatusFilter]     = useState<"all" | "active" | "outofstock">("all");
  const [imageInputType, setImageInputType] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview]     = useState<string>("");
  const [imageData, setImageData]           = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const imageFileRef                        = React.useRef<HTMLInputElement>(null);
  const [productName, setProductName]       = useState("");
  const [productSlug, setProductSlug]       = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [formCategoryId, setFormCategoryId] = useState<number | string>("");

  const isFormCombo = Boolean(
    formCategoryId &&
    categories.some(c => String(c.id) === String(formCategoryId) && (c.slug === "combos" || c.name.toLowerCase() === "combos"))
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      if (catParam) {
        if (catParam.toLowerCase() === "combos") {
          setTabFilter("combos");
          setCategoryFilter("");
        } else {
          setCategoryFilter(catParam.toLowerCase());
        }
      }
    }
  }, []);

  // ── Variant state ──────────────────────────────────────────────────────────
  // hasVariants: toggle on the form
    const [hasVariants, setHasVariants]       = useState(false);
  const [variantType, setVariantType]       = useState<VariantType>("Weight");
  // draftVariants: in-form list before saving to DB
  const [draftVariants, setDraftVariants]   = useState<DraftVariant[]>([]);
  const [draftVariantType, setDraftVariantType] = useState<"weight" | "pack">("weight");
  const [draftLabel, setDraftLabel]         = useState("");
  const [draftApproxWeight, setDraftApproxWeight] = useState("");
  const [draftPrice, setDraftPrice]         = useState("");
  const [draftOffer, setDraftOffer]         = useState("");
  // savedVariants: loaded from DB when editing
  const [savedVariants, setSavedVariants]   = useState<Variant[]>([]);
  const [variantSaving, setVariantSaving]   = useState(false);
  // inline editing of a saved variant
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [editVariantType, setEditVariantType]   = useState<"weight" | "pack">("weight");
  const [editWeight, setEditWeight] = useState("");
  const [editApproxWeight, setEditApproxWeight] = useState("");
  const [editPrice, setEditPrice]   = useState("");
  const [editOffer, setEditOffer]   = useState("");
  // inline editing of a draft variant (before save)
  const [editingDraftKey, setEditingDraftKey] = useState<string | null>(null);

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
          variantType: v.variantType,
          weight: v.label,
          approxWeight: v.approxWeight,
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

    async function saveVariantEdit(productId: number, variantId: number) {
    if (!editWeight.trim() || !editPrice) return;
    setVariantSaving(true);
    try {
      const approx = editVariantType === "pack" ? (editApproxWeight.trim() || null) : (editApproxWeight.trim() || editWeight.trim());
      await fetch(`/api/admin/products/${productId}/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantType: editVariantType,
          weight: editWeight.trim(),
          approxWeight: approx,
          price: parseFloat(editPrice),
          offerPrice: editOffer ? parseFloat(editOffer) : null,
        }),
      });
      setEditingVariantId(null);
      await loadSavedVariants(productId);
      await syncProductPriceFromVariants(productId);
    } finally { setVariantSaving(false); }
  }

    async function addSavedVariant(productId: number) {
    if (!draftLabel.trim() || !draftPrice) return;
    setVariantSaving(true);
    try {
      const approx = draftVariantType === "pack" ? (draftApproxWeight.trim() || null) : (draftApproxWeight.trim() || draftLabel.trim());
      await fetch(`/api/admin/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantType: draftVariantType,
          weight: draftLabel.trim(),
          approxWeight: approx,
          price: parseFloat(draftPrice),
          offerPrice: draftOffer ? parseFloat(draftOffer) : null,
          sortOrder: savedVariants.length,
        }),
      });
      await loadSavedVariants(productId);
      await syncProductPriceFromVariants(productId);
      setDraftLabel(""); setDraftApproxWeight(""); setDraftPrice(""); setDraftOffer("");
    } finally { setVariantSaving(false); }
  }

  function addDraftVariant() {
    if (!draftLabel.trim() || !draftPrice) return;
    const approx = draftVariantType === "pack" ? (draftApproxWeight.trim() || "") : (draftApproxWeight.trim() || draftLabel.trim());
    setDraftVariants(prev => [...prev, {
      key: `${Date.now()}`,
      variantType: draftVariantType,
      label: draftLabel.trim(),
      approxWeight: approx,
      price: draftPrice,
      offerPrice: draftOffer,
    }]);
    setDraftLabel(""); setDraftApproxWeight(""); setDraftPrice(""); setDraftOffer("");
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
      // Compress image first, then upload to R2
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        const b64 = canvas.toDataURL("image/jpeg", 0.8);
        setImagePreview(b64);
        setImageUploading(true);

        try {
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: b64, filename: file.name }),
          });
          const data = await res.json() as { url?: string; error?: string };
          if (res.ok && data.url) {
            setImageData(data.url);
            showToast("Product image uploaded to Cloudflare R2.");
          } else {
            setImageData("");
            showToast(data.error || "R2 image upload failed. Please try again.", false);
          }
        } catch {
          setImageData("");
          showToast("Image upload error. Cloudflare R2 may be unconfigured.", false);
        } finally {
          setImageUploading(false);
        }
      };
      img.src = objectUrl;
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setProductName(product.name);
    setProductSlug(product.slug);
    setFormCategoryId(product.categoryId ?? "");
    setShowForm(true);
    setImageInputType(product.image?.startsWith("data:") || product.image?.startsWith("https://") ? "file" : "url");
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
    setFormCategoryId("");
    setImagePreview(""); setImageData("");
    setError("");
    setHasVariants(false);
    setVariantType("Weight");
    setDraftVariants([]);
    setSavedVariants([]);
    setDraftLabel(""); setDraftPrice(""); setDraftOffer("");
  }

  function handleAddCombo() {
    handleCloseForm();
    const comboCat = categories.find(c => c.slug === "combos" || c.name.toLowerCase() === "combos");
    if (comboCat) {
      setFormCategoryId(comboCat.id);
    }
    setShowForm(true);
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
    if (imageUploading) {
      setError("Please wait for image upload to complete.");
      setLoading(false);
      return;
    }
    if (imageInputType === "file" && imageData.startsWith("data:image/")) {
      setError("Image upload to Cloudflare R2 did not complete. Please re-select the image.");
      setLoading(false);
      return;
    }
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
            active: formData.get("active") === "on",
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
          handleCloseForm();
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

  const comboCategory = categories.find(c => c.slug === "combos" || c.name.toLowerCase() === "combos");
  const comboCategoryId = comboCategory?.id;

  const isCombo = (p: Product) => {
    return (p.categoryName || "").toLowerCase() === "combos" || (comboCategoryId != null && p.categoryId === comboCategoryId);
  };

  const totalCount = products.length;
  const combosCount = products.filter(isCombo).length;
  const regularCount = totalCount - combosCount;
  const activeCount = products.filter(p => p.active !== false && p.stock !== 0).length;
  const outOfStockCount = totalCount - activeCount;

  const filteredProducts = products.filter((p) => {
    const pIsCombo = isCombo(p);

    // Tab filter
    if (tabFilter === "combos" && !pIsCombo) return false;
    if (tabFilter === "regular" && pIsCombo) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCategory = (p.categoryName || "").toLowerCase().includes(q);
      const matchIngredients = (p.ingredients || "").toLowerCase().includes(q);
      if (!matchName && !matchCategory && !matchIngredients) return false;
    }

    // Category filter dropdown
    if (categoryFilter) {
      if (categoryFilter === "combos") {
        if (!pIsCombo) return false;
      } else {
        const matchCategory = (p.categoryName || "").toLowerCase() === categoryFilter.toLowerCase() || String(p.categoryId) === categoryFilter;
        if (!matchCategory) return false;
      }
    }

    // Status filter
    if (statusFilter === "active" && (p.active === false || p.stock === 0)) return false;
    if (statusFilter === "outofstock" && (p.active !== false && p.stock !== 0)) return false;

    return true;
  });

  const hasActiveFilters = searchQuery.trim() !== "" || categoryFilter !== "" || statusFilter !== "all" || tabFilter !== "all";

  function handleResetFilters() {
    setSearchQuery("");
    setCategoryFilter("");
    setStatusFilter("all");
    setTabFilter("all");
  }

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
          <p className={styles.eyebrow}>Catalog Management</p>
          <h1>Products</h1>
          <p>Manage snacks, variety packs, and festive combo gift boxes.</p>
        </div>
        <div className={productStyles.headerBtnGroup}>
          <button className={styles.primaryButton} onClick={() => { handleCloseForm(); setShowForm(true); }} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            + Add Product
          </button>
        </div>
        <div className={styles.headerBell}><AdminHeaderActions /></div>
      </header>

      {/* Stat Banners / Quick Filter Cards */}
      <div className={productStyles.statsGrid}>
        <div
          className={`${productStyles.statCard} ${tabFilter === "all" && statusFilter === "all" && !categoryFilter ? productStyles.statCardActive : ""}`}
          onClick={() => { setTabFilter("all"); setCategoryFilter(""); setStatusFilter("all"); }}
          role="button"
          tabIndex={0}
        >
          <span className={productStyles.statLabel}>Total Catalog</span>
          <strong className={productStyles.statValue}>{totalCount}</strong>
          <span className={productStyles.statHint}>All items</span>
        </div>
        <div
          className={`${productStyles.statCard} ${tabFilter === "regular" ? productStyles.statCardActive : ""}`}
          onClick={() => { setTabFilter("regular"); setCategoryFilter(""); }}
          role="button"
          tabIndex={0}
        >
          <span className={productStyles.statLabel}>Single Snacks</span>
          <strong className={productStyles.statValue}>{regularCount}</strong>
          <span className={productStyles.statHint}>Regular products</span>
        </div>
        <div
          className={`${productStyles.statCard} ${tabFilter === "combos" ? productStyles.statCardActive : ""}`}
          onClick={() => { setTabFilter("combos"); setCategoryFilter(""); }}
          role="button"
          tabIndex={0}
        >
          <span className={productStyles.statLabel}> Combos</span>
          <strong className={productStyles.statValue} style={{ color: "#b45309" }}>{combosCount}</strong>
          <span className={productStyles.statHint}>Curated gift boxes</span>
        </div>
        <div
          className={`${productStyles.statCard} ${statusFilter === "active" ? productStyles.statCardActive : ""}`}
          onClick={() => setStatusFilter(statusFilter === "active" ? "all" : "active")}
          role="button"
          tabIndex={0}
        >
          <span className={productStyles.statLabel}>Active</span>
          <strong className={productStyles.statValue} style={{ color: "#166534" }}>{activeCount}</strong>
          <span className={productStyles.statHint}>Available for sale</span>
        </div>
        <div
          className={`${productStyles.statCard} ${statusFilter === "outofstock" ? productStyles.statCardActive : ""}`}
          onClick={() => setStatusFilter(statusFilter === "outofstock" ? "all" : "outofstock")}
          role="button"
          tabIndex={0}
        >
          <span className={productStyles.statLabel}>Out of Stock</span>
          <strong className={productStyles.statValue} style={{ color: outOfStockCount > 0 ? "#dc2626" : "var(--ink)" }}>{outOfStockCount}</strong>
          <span className={productStyles.statHint}>Needs restock</span>
        </div>
      </div>

      {/* Main Catalog Workspace */}
      <section className={styles.workspace}>
        {/* Top Segment Tabs */}
        <div className={productStyles.tabBar}>
          <button
            type="button"
            className={`${productStyles.tabButton} ${tabFilter === "all" ? productStyles.tabButtonActive : ""}`}
            onClick={() => { setTabFilter("all"); setCategoryFilter(""); }}
          >
            All Products
            <span className={productStyles.tabBadge}>{totalCount}</span>
          </button>
          <button
            type="button"
            className={`${productStyles.tabButton} ${tabFilter === "regular" ? productStyles.tabButtonActive : ""}`}
            onClick={() => { setTabFilter("regular"); setCategoryFilter(""); }}
          >
            Single Snacks
            <span className={productStyles.tabBadge}>{regularCount}</span>
          </button>
          <button
            type="button"
            className={`${productStyles.tabButton} ${tabFilter === "combos" ? productStyles.tabButtonActive : ""}`}
            onClick={() => { setTabFilter("combos"); setCategoryFilter(""); }}
          >
             Combos
            <span className={productStyles.tabBadge}>{combosCount}</span>
          </button>
        </div>

        {/* Unified Clean Toolbar */}
        <div className={productStyles.toolbar}>
          {/* Search */}
          <div className={productStyles.searchBox}>
            <span className={productStyles.searchIcon}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              className={productStyles.searchInput}
              placeholder={tabFilter === "combos" ? "Search combo boxes or items inside…" : "Search snacks by name, category, ingredients…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={productStyles.clearSearchBtn}
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Filter dropdowns */}
          <div className={productStyles.filterControls}>
            {/* Category dropdown (only for All or Regular items) */}
            {tabFilter !== "combos" && (
              <div className={productStyles.selectWrap}>
                <span className={productStyles.selectIcon}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                  </svg>
                </span>
                <select
                  className={productStyles.customSelect}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter products by category"
                >
                  <option value="">All Categories ({tabFilter === "regular" ? regularCount : totalCount})</option>
                  {categories.filter(c => c.slug !== "combos").map((c) => {
                    const count = products.filter(p => p.categoryId === c.id).length;
                    return (
                      <option key={c.id} value={c.name}>
                        {c.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Status dropdown */}
            <div className={productStyles.selectWrap}>
              <select
                className={productStyles.customSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "outofstock")}
                aria-label="Filter by stock status"
                style={{ paddingLeft: 14 }}
              >
                <option value="all">All Status</option>
                <option value="active">Active ({activeCount})</option>
                <option value="outofstock">Out of Stock ({outOfStockCount})</option>
              </select>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                className={productStyles.resetBtn}
                onClick={handleResetFilters}
                title="Reset all filters"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th className={productStyles.hideOnMobile}>Category</th>
                <th className={productStyles.hideOnMobile}>Price</th>
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
                        <circle cx="12" cy="8" r="6"/>
                        <path d="M15.5 13.5c-1.5-1-3.5-1-5 0"/>
                      </svg>
                      <h3>No products match your filters</h3>
                      <p>Try clearing your search or category filters to see more products.</p>
                      <button className={styles.primaryButton} onClick={handleResetFilters} type="button">
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.map((product) => {
                const productIsCombo = isCombo(product);
                const hasOffer = Boolean(
                  product.offerPrice &&
                  parseFloat(product.offerPrice) > 0 &&
                  parseFloat(product.offerPrice) < parseFloat(product.price)
                );
                const discountPct = hasOffer
                  ? Math.round(((parseFloat(product.price) - parseFloat(product.offerPrice!)) / parseFloat(product.price)) * 100)
                  : null;
                const isOutOfStock = product.active === false || product.stock === 0;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className={productStyles.productCell}>
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className={productStyles.productThumb}
                            loading="lazy"
                          />
                        ) : (
                          <div className={productStyles.productThumbFallback}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="7" width="20" height="14" rx="2" />
                              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                            </svg>
                          </div>
                        )}

                        <div className={productStyles.productDetails}>
                          <div className={productStyles.productNameRow}>
                            <span className={productStyles.productNameText}>{product.name}</span>
                            {productIsCombo && (
                              <span className={productStyles.comboBadge}>
                                 Combo Pack
                              </span>
                            )}
                          </div>

                          {/* Combo contents or Regular specs */}
                          {productIsCombo ? (
                            <>
                              {product.ingredients && (
                                <div className={productStyles.comboContents} title="Box contents">
                                  <strong>Inside:</strong> {product.ingredients}
                                </div>
                              )}
                              {product.weight && product.weight !== "—" && (
                                <span className={productStyles.shippingWeightBadge}>
                                  📦 Courier Shipping Wt: {product.weight}
                                </span>
                              )}
                            </>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              {product.weight && product.weight !== "—" && (product.variantCount ?? 0) === 0 && (
                                <span className={productStyles.weightBadge}>
                                  ⚖️ {formatWeight(product.weight)}
                                </span>
                              )}
                              {(product.variantCount ?? 0) > 0 && (
                                <span className={productStyles.variantCountBadge}>
                                  🏷️ {product.variantCount} variant{(product.variantCount ?? 0) !== 1 ? "s" : ""}
                                </span>
                              )}
                              {product.shelfLife && (
                                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                                  • Shelf life: {product.shelfLife}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Mobile subtext */}
                          <div className={productStyles.mobileSubtext}>
                            {product.categoryName && (
                              <span className={productStyles.categoryTag} style={{ fontSize: 11, padding: "2px 6px" }}>
                                {product.categoryName}
                              </span>
                            )}
                            <span className={productStyles.mobilePriceBadge}>
                              {hasOffer ? `₹${product.offerPrice}` : `₹${product.price}`}
                            </span>
                            {isOutOfStock ? (
                              <span className={productStyles.statusOut} style={{ fontSize: 11, padding: "2px 8px" }}>
                                <span className={productStyles.statusOutDot} />Out of Stock
                              </span>
                            ) : (
                              <span className={productStyles.statusActive} style={{ fontSize: 11, padding: "2px 8px" }}>
                                <span className={productStyles.statusActiveDot} />Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className={productStyles.hideOnMobile}>
                      <span className={productStyles.categoryTag}>
                        {product.categoryName ?? "—"}
                      </span>
                    </td>

                    {/* Price */}
                    <td className={productStyles.hideOnMobile}>
                      <div className={productStyles.priceBlock}>
                        <div className={productStyles.priceRow}>
                          <span className={productStyles.currentPrice}>
                            {(product.variantCount ?? 0) > 0 && !hasOffer ? `From ` : ""}
                            ₹{hasOffer ? product.offerPrice : product.price}
                          </span>
                          {hasOffer && (
                            <>
                              <span className={productStyles.originalPrice}>₹{product.price}</span>
                              {discountPct !== null && (
                                <span className={productStyles.discountBadge}>-{discountPct}%</span>
                              )}
                            </>
                          )}
                        </div>
                        {(product.variantCount ?? 0) > 0 && (
                          <span className={productStyles.variantCountBadge}>
                            {product.variantCount} variant prices
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className={productStyles.hideOnMobile}>
                      {isOutOfStock ? (
                        <span className={productStyles.statusOut}>
                          <span className={productStyles.statusOutDot} />
                          Out of Stock
                        </span>
                      ) : (
                        <span className={productStyles.statusActive}>
                          <span className={productStyles.statusActiveDot} />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className={productStyles.actionGroup}>
                        <a
                          href={`/product/${product.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className={productStyles.viewStoreLink}
                          title="View on store ↗"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                        <button className={styles.iconButton} onClick={() => handleEdit(product)} title="Edit product" type="button">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className={`${styles.iconButton} ${productStyles.deleteBtn}`} onClick={() => setConfirmDeleteId(product.id)} title="Delete product" type="button">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                  <select
                    name="categoryId"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Has variants toggle (hidden for Combos) ── */}
              {!isFormCombo && (
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
              )}

              {/* ── Single price/weight (shown when NO variants or is combo) ── */}
              {(!hasVariants || isFormCombo) && (
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
                    <label>
                      {isFormCombo
                        ? "Total Parcel Weight (Courier Shipping Weight)"
                        : "Weight"}
                    </label>
                    <input
                      type="text"
                      name="weight"
                      placeholder={isFormCombo
                        ? "e.g., 500g, 800g, 1.2kg"
                        : "e.g., 250g"}
                      defaultValue={editingProduct?.weight}
                      required
                    />
                    {isFormCombo && (
                      <small style={{ color: "#b45309", fontSize: "11px", display: "block", marginTop: 4 }}>
                        * Used behind the scenes to calculate courier delivery charges at checkout. Kept hidden from customer view.
                      </small>
                    )}
                  </div>
                </div>
              )}

              {/* ── Variant builder (shown when HAS variants and NOT combo) ── */}
              {hasVariants && !isFormCombo && (
                <div style={{ marginBottom: 20, padding: "16px", background: "var(--cream)", borderRadius: 10, border: "1px solid var(--line)" }}>
                  {/* Variant type selector removed - not stored in DB */}

                  {/* Saved variants (when editing) */}
                  {editingProduct && savedVariants.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved variants</p>
                      {savedVariants.map(v => (
                        <div key={v.id} style={{ padding: "8px 10px", background: "var(--paper)", borderRadius: 7, border: `1px solid ${editingVariantId === v.id ? "var(--terracotta)" : "var(--line)"}`, marginBottom: 6 }}>
                          {editingVariantId === v.id ? (
                            // ── Inline edit mode ──
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <select
                                  value={editVariantType}
                                  onChange={e => setEditVariantType(e.target.value as "weight" | "pack")}
                                  style={{ padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                                >
                                  <option value="weight">Weight-based</option>
                                  <option value="pack">Pack-based</option>
                                </select>
                                <input
                                  type="text"
                                  value={editWeight}
                                  onChange={e => setEditWeight(e.target.value)}
                                  placeholder={editVariantType === "pack" ? "Pack Name (e.g. Pack of 3)" : "Weight (e.g. 250g)"}
                                  style={{ flex: 1, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
                                />
                                {editVariantType === "pack" && (
                                  <input
                                    type="text"
                                    value={editApproxWeight}
                                    onChange={e => setEditApproxWeight(e.target.value)}
                                    placeholder="Approx weight (e.g. 100g)"
                                    style={{ flex: 1, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
                                  />
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Price" style={{ width: 85, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
                                <input type="number" value={editOffer} onChange={e => setEditOffer(e.target.value)} placeholder="Offer (opt)" style={{ width: 85, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
                                <button type="button" className={styles.primaryButton} style={{ padding: "4px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                                  disabled={variantSaving || !editWeight.trim() || !editPrice}
                                  onClick={() => saveVariantEdit(editingProduct!.id, v.id)}>
                                  {variantSaving ? "…" : "Save"}
                                </button>
                                <button type="button" className={styles.secondaryButton} style={{ padding: "4px 10px", fontSize: 12 }}
                                  onClick={() => setEditingVariantId(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // ── Display mode ──
                            <div className={styles.variantEditRow}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
                                <span style={{ font: "600 13px 'DM Sans',sans-serif" }}>{v.weight}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "1px 5px", borderRadius: 4, background: v.variantType === "pack" ? "#eff6ff" : "#f3f4f6", color: v.variantType === "pack" ? "#1d4ed8" : "#4b5563" }}>
                                  {v.variantType === "pack" ? "Pack" : "Weight"}
                                </span>
                                {v.variantType === "pack" && v.approxWeight && (
                                  <span style={{ fontSize: 12, color: "#6b7280" }}>(approx. {v.approxWeight})</span>
                                )}
                              </div>
                              <span style={{ fontSize: 12, color: "#6b7280" }}>₹{v.price}{v.offerPrice ? ` → ₹${v.offerPrice}` : ""}</span>
                              <button type="button" className={styles.iconButton} title="Edit variant"
                                onClick={() => {
                                  setEditingVariantId(v.id);
                                  setEditVariantType(v.variantType === "pack" ? "pack" : "weight");
                                  setEditWeight(v.weight);
                                  setEditApproxWeight(v.approxWeight || "");
                                  setEditPrice(v.price);
                                  setEditOffer(v.offerPrice ?? "");
                                }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button type="button" className={styles.iconButton} onClick={() => deleteSavedVariant(editingProduct!.id, v.id)} title="Remove">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Draft variants (before save) */}
                  {draftVariants.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Added variants</p>
                      {draftVariants.map(v => (
                        <div key={v.key} style={{ padding: "8px 10px", background: "var(--paper)", borderRadius: 7, border: `1px solid ${editingDraftKey === v.key ? "var(--terracotta)" : "var(--line)"}`, marginBottom: 6 }}>
                          {editingDraftKey === v.key ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <select
                                  value={editVariantType}
                                  onChange={e => setEditVariantType(e.target.value as "weight" | "pack")}
                                  style={{ padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                                >
                                  <option value="weight">Weight-based</option>
                                  <option value="pack">Pack-based</option>
                                </select>
                                <input
                                  type="text"
                                  value={editWeight}
                                  onChange={e => setEditWeight(e.target.value)}
                                  placeholder={editVariantType === "pack" ? "Pack Name (e.g. Pack of 3)" : "Weight (e.g. 250g)"}
                                  style={{ flex: 1, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
                                />
                                {editVariantType === "pack" && (
                                  <input
                                    type="text"
                                    value={editApproxWeight}
                                    onChange={e => setEditApproxWeight(e.target.value)}
                                    placeholder="Approx weight (e.g. 100g)"
                                    style={{ flex: 1, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}
                                  />
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="Price" style={{ width: 85, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
                                <input type="number" value={editOffer} onChange={e => setEditOffer(e.target.value)} placeholder="Offer (opt)" style={{ width: 85, padding: "4px 8px", border: "1.5px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
                                <button type="button" className={styles.primaryButton} style={{ padding: "4px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                                  disabled={!editWeight.trim() || !editPrice}
                                  onClick={() => {
                                    const approx = editVariantType === "pack" ? (editApproxWeight.trim() || "") : (editApproxWeight.trim() || editWeight.trim());
                                    setDraftVariants(prev => prev.map(d => d.key === v.key ? { ...d, variantType: editVariantType, label: editWeight.trim(), approxWeight: approx, price: editPrice, offerPrice: editOffer } : d));
                                    setEditingDraftKey(null);
                                  }}>
                                  Save
                                </button>
                                <button type="button" className={styles.secondaryButton} style={{ padding: "4px 10px", fontSize: 12 }}
                                  onClick={() => setEditingDraftKey(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={styles.variantEditRow}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
                                <span style={{ font: "600 13px 'DM Sans',sans-serif" }}>{v.label}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "1px 5px", borderRadius: 4, background: v.variantType === "pack" ? "#eff6ff" : "#f3f4f6", color: v.variantType === "pack" ? "#1d4ed8" : "#4b5563" }}>
                                  {v.variantType === "pack" ? "Pack" : "Weight"}
                                </span>
                                {v.variantType === "pack" && v.approxWeight && (
                                  <span style={{ fontSize: 12, color: "#6b7280" }}>(approx. {v.approxWeight})</span>
                                )}
                              </div>
                              <span style={{ fontSize: 12, color: "#6b7280" }}>₹{v.price}{v.offerPrice ? ` → ₹${v.offerPrice}` : ""}</span>
                              <button type="button" className={styles.iconButton} title="Edit"
                                onClick={() => {
                                  setEditingDraftKey(v.key);
                                  setEditVariantType(v.variantType);
                                  setEditWeight(v.label);
                                  setEditApproxWeight(v.approxWeight || "");
                                  setEditPrice(v.price);
                                  setEditOffer(v.offerPrice ?? "");
                                }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                              <button type="button" className={styles.iconButton} onClick={() => removeDraftVariant(v.key)} title="Remove">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add variant row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Add a variant
                    </p>
                    <div style={{ display: "inline-flex", background: "var(--line)", padding: 2, borderRadius: 6, gap: 2 }}>
                      <button
                        type="button"
                        onClick={() => { setDraftVariantType("weight"); setDraftLabel(""); setDraftApproxWeight(""); }}
                        style={{
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 5,
                          border: "none",
                          cursor: "pointer",
                          background: draftVariantType === "weight" ? "var(--terracotta)" : "transparent",
                          color: draftVariantType === "weight" ? "#fff" : "var(--ink)",
                        }}
                      >
                        Weight-based
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDraftVariantType("pack"); setDraftLabel(""); setDraftApproxWeight(""); }}
                        style={{
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 5,
                          border: "none",
                          cursor: "pointer",
                          background: draftVariantType === "pack" ? "var(--terracotta)" : "transparent",
                          color: draftVariantType === "pack" ? "#fff" : "var(--ink)",
                        }}
                      >
                        Pack-based
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                    {draftVariantType === "weight" ? (
                      <div className={styles.field} style={{ flex: "1 1 120px", minWidth: 100 }}>
                        <label>Weight (e.g. 250g, 500g, 1kg)</label>
                        <input
                          type="text"
                          placeholder="e.g. 250g"
                          value={draftLabel}
                          onChange={(e) => setDraftLabel(e.target.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className={styles.field} style={{ flex: "1 1 110px", minWidth: 90 }}>
                          <label>Pack Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Pack of 3"
                            value={draftLabel}
                            onChange={(e) => setDraftLabel(e.target.value)}
                          />
                        </div>
                        <div className={styles.field} style={{ flex: "1 1 110px", minWidth: 90 }}>
                          <label>Approx Weight (for shipping)</label>
                          <input
                            type="text"
                            placeholder="e.g. 100g, 150g"
                            value={draftApproxWeight}
                            onChange={(e) => setDraftApproxWeight(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    <div className={styles.field} style={{ flex: "1 1 85px", minWidth: 75 }}>
                      <label>Price (₹)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value)} />
                    </div>
                    <div className={styles.field} style={{ flex: "1 1 85px", minWidth: 75 }}>
                      <label>Offer Price</label>
                      <input type="number" min="0" step="0.01" placeholder="Optional" value={draftOffer} onChange={(e) => setDraftOffer(e.target.value)} />
                    </div>
                    {editingProduct ? (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={variantSaving || !draftLabel.trim() || !draftPrice || (draftVariantType === "pack" && !draftApproxWeight.trim())}
                        onClick={() => addSavedVariant(editingProduct.id)}
                        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        {variantSaving ? "Saving…" : "+ Add"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.primaryButton}
                        disabled={!draftLabel.trim() || !draftPrice || (draftVariantType === "pack" && !draftApproxWeight.trim())}
                        onClick={addDraftVariant}
                        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                      >
                        + Add
                      </button>
                    )}
                  </div>
                  {draftVariantType === "pack" && (
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6b7280" }}>
                      * Approx weight is used to calculate courier shipping charges accurately at checkout.
                    </p>
                  )}
                </div>
              )}

              {/* Description / Ingredients */}
              <div className={styles.field}>
                <label>Description</label>
                <textarea name="description" rows={4} placeholder="Product description…" defaultValue={editingProduct?.description} required></textarea>
              </div>
              <div className={styles.field}>
                <label>
                  {isFormCombo
                    ? "What's inside this combo box (shown to customers)"
                    : "Ingredients"}
                </label>
                <textarea
                  name="ingredients"
                  rows={3}
                  placeholder={isFormCombo
                    ? "e.g. Butter Murukku (500g), Special Mixture (3 nos), Sweet Boondi (250g)"
                    : "List ingredients…"}
                  defaultValue={editingProduct?.ingredients ?? ""}
                ></textarea>
                {isFormCombo && (
                  <small style={{ color: "#6b7280", fontSize: "11px", display: "block", marginTop: 4 }}>
                    List items inside this combo separated by commas. Each item will be displayed as a distinct item with its weight/nos on the website.
                  </small>
                )}
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
                      {/* Show file input only when no image is chosen yet */}
                      {!imagePreview && (
                        <input
                          type="file"
                          accept="image/*"
                          ref={imageFileRef}
                          onChange={handleImageUpload}
                          style={{ marginBottom: "8px" }}
                        />
                      )}
                      {imageUploading && (
                        <p style={{ fontSize: 12, color: "var(--terracotta)", margin: "4px 0" }}>⏳ Uploading to cloud…</p>
                      )}
                      {imagePreview && !imageUploading && (
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
                            onClick={() => { setImagePreview(""); setImageData(""); if (imageFileRef.current) imageFileRef.current.value = ""; }}
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
              <div className={styles.checkboxGroup} style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <label className={styles.checkbox}>
                  <input type="checkbox" name="active" defaultChecked={editingProduct ? (editingProduct.active !== false && editingProduct.stock !== 0) : true} />
                  <span>Active (In Stock)</span>
                </label>
                </div>

              {error && (
                <div style={{ padding: "12px", background: "#fee2e2", border: "1px solid #dc2626", borderRadius: "8px", color: "#991b1b", marginBottom: "12px" }}>{error}</div>
              )}
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

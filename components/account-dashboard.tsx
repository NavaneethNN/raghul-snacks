"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { OrderDetailModal } from "@/components/order-detail-modal";
import styles from "./account-dashboard.module.css";

type Order = {
  id: number;
  orderNumber: string;
  total: string;
  discount: string;
  couponCode: string | null;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
  items: Array<{
    id: number;
    productId: number | null;
    variantId?: number | null;
    name: string;
    quantity: number;
    price: string;
    weight?: string | null;
    product: {
      id: number;
      name: string;
      slug: string;
      description: string;
      ingredients: string | null;
      price: string;
      offerPrice: string | null;
      weight: string;
      categoryId: number | null;
      image: string | null;
      active?: boolean;
      stock?: number;
      variants?: Array<{ id: number; weight: string; price: string; offerPrice: string | null }>;
    } | null;
  }>;
};

type AccountDashboardProps = {
  account: {
    name: string;
    email: string;
    createdAt: Date;
    isAdmin?: boolean;
  };
  orders: Order[];
};

type UserMessage = {
  id: number;
  subject: string;
  message: string;
  adminReply: string | null;
  replyAt: string | null;
  createdAt: string;
};

type SavedAddress = {
  id: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type TabType = "profile" | "orders" | "messages";

export function AccountDashboard({ account, orders }: AccountDashboardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [name, setName] = useState(account.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);

  // Inline review state
  const [reviewingItemId, setReviewingItemId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHovered, setReviewHovered] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Saved delivery addresses state
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    name: account.name || "",
    phone: "",
    address: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const loadAddresses = useCallback(() => {
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d: { addresses?: SavedAddress[] }) => {
        if (d.addresses) setAddresses(d.addresses);
      })
      .catch(() => {})
      .finally(() => setAddressLoaded(true));
  }, []);

  // Messages state
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    fetch("/api/reviews/mine")
      .then((r) => r.json())
      .then((d: { reviewedProductIds?: number[] }) => setReviewedProductIds(d.reviewedProductIds ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "messages" && !messagesLoaded) {
      fetch("/api/messages/mine", { credentials: "include" })
        .then((r) => r.json())
        .then((d: { messages: UserMessage[] }) => setUserMessages(d.messages ?? []))
        .catch(() => {})
        .finally(() => setMessagesLoaded(true));
    }
  }, [activeTab, messagesLoaded]);

  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  async function handleSignOut() {
    setSigningOut(true);
    setConfirmSignOut(false);
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (response.ok) {
        window.localStorage.removeItem("raghul-snacks-cart");
        window.localStorage.removeItem("raghul-snacks-cart-account");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      setSigningOut(false);
    }
  }

  function downloadInvoice(orderNumber: string) {
    const link = document.createElement("a");
    link.href = `/api/orders/${orderNumber}/invoice`;
    link.download = `Invoice-${orderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function startEditingName() {
    setNameDraft(name);
    setNameError("");
    setEditingName(true);
  }

  function cancelEditingName() {
    setEditingName(false);
    setNameError("");
    setNameDraft(name);
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2) {
      setNameError("Name must be at least 2 characters long.");
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json() as { account?: { name: string }; error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to update your name.");
      setName(data.account?.name || trimmed);
      setEditingName(false);
      router.refresh();
    } catch (error) {
      setNameError(error instanceof Error ? error.message : "Unable to update your name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleCreateAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!addressDraft.name.trim() || addressDraft.name.trim().length < 2) {
      setAddressError("Please enter recipient name (at least 2 characters).");
      return;
    }
    if (!addressDraft.phone.trim() || !/^(\+91)?[6-9]\d{9}$/.test(addressDraft.phone.trim())) {
      setAddressError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!addressDraft.address.trim() || addressDraft.address.trim().length < 6) {
      setAddressError("Please enter a complete street address.");
      return;
    }
    if (!addressDraft.city.trim()) {
      setAddressError("Please enter city / district.");
      return;
    }
    if (!addressDraft.state.trim()) {
      setAddressError("Please enter state.");
      return;
    }
    if (!addressDraft.pincode.trim() || !/^\d{6}$/.test(addressDraft.pincode.trim())) {
      setAddressError("Please enter a valid 6-digit PIN code.");
      return;
    }

    setSavingAddress(true);
    setAddressError("");
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressDraft),
      });
      const data = (await res.json()) as { address?: SavedAddress; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save address.");

      setShowAddAddress(false);
      setAddressDraft({
        name: name || account.name || "",
        phone: "",
        address: "",
        city: "",
        state: "Tamil Nadu",
        pincode: "",
        isDefault: false,
      });
      loadAddresses();
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Failed to save address.");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleSetDefaultAddress(id: number) {
    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            isDefault: a.id === id,
          }))
        );
      }
    } catch {
      // non-fatal
    }
  }

  async function handleDeleteAddress(id: number) {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // non-fatal
    }
  }

  async function submitReview(productId: number) {
    if (!reviewRating) { setReviewError("Please select a rating."); return; }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating: reviewRating, content: reviewContent.trim() }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");
      setReviewedProductIds((prev) => [...prev, productId]);
      setReviewingItemId(null);
      setReviewRating(0);
      setReviewContent("");
      try {
        localStorage.setItem("review-posted", "true");
        localStorage.setItem(`reviewed-prod-${productId}`, "true");
        localStorage.setItem("delivery-nudge-dismissed", "true");
        sessionStorage.setItem("delivery-nudge-dismissed", "true");
        localStorage.setItem("delivery-notification-dismissed-permanently", "true");
      } catch {}
      window.dispatchEvent(new Event("review-submitted"));
      window.dispatchEvent(new CustomEvent("product-reviewed", { detail: { productId } }));
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function handleBuyAgain(order: Order) {
    if (!order.items || order.items.length === 0) {
      alert("No items in this order");
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    order.items.forEach((item) => {
      if (item.product) {
        const p = item.product;
        const matchedVariant =
          item.variantId && p.variants
            ? p.variants.find((v) => v.id === item.variantId)
            : item.weight && p.variants
            ? p.variants.find((v) => v.weight.toLowerCase() === item.weight!.toLowerCase())
            : null;

        const effectivePrice = matchedVariant
          ? parseFloat(matchedVariant.offerPrice || matchedVariant.price)
          : parseFloat(p.offerPrice || p.price);

        const cartItemId = matchedVariant ? `${p.id}-v${matchedVariant.id}` : String(p.id);

        addItem(
          {
            id: cartItemId,
            name: p.name,
            slug: p.slug,
            category: "Snacks",
            description: p.description || "",
            ingredients: p.ingredients || "",
            price: parseFloat(matchedVariant?.price || p.price),
            offerPrice: effectivePrice,
            weight: matchedVariant?.weight || item.weight || p.weight,
            image: p.image || "/placeholder.jpg",
          },
          item.quantity
        );
        addedCount++;
      } else {
        skippedCount++;
      }
    });

    if (addedCount === 0) {
      alert("These products are no longer available.");
      return;
    }
    if (skippedCount > 0) {
      alert(`${addedCount} item${addedCount > 1 ? "s" : ""} added to cart. ${skippedCount} item${skippedCount > 1 ? "s are" : " is"} no longer available.`);
    }
    router.push("/cart");
  }

  const initials = (name || account.name || "U")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const repliedMessagesCount = userMessages.filter((m) => m.adminReply).length;

  return (
    <div className={styles.container}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>My Account</h1>
          <p>Manage your profile, view orders, and message customer support.</p>
        </div>
      </div>

      {/* Order detail modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onDownloadInvoice={downloadInvoice}
          onBuyAgain={handleBuyAgain}
          reviewedProductIds={reviewedProductIds}
        />
      )}

      {/* Main Two-Column Layout */}
      <div className={styles.content}>
        <div className={styles.layoutGrid}>
          {/* ── Left Column: Sidebar ── */}
          <aside className={styles.sidebarCard}>
            {/* User Profile Summary */}
            <div className={styles.sidebarUser}>
              <div className={styles.sidebarAvatar}>
                {initials || "U"}
              </div>
              <div className={styles.sidebarUserInfo}>
                <span className={styles.sidebarUserName}>{name}</span>
                <span className={styles.sidebarUserEmail}>{account.email}</span>
                {account.isAdmin ? (
                  <span className={styles.adminBadge}>Store Admin</span>
                ) : (
                  <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Mono',monospace" }}>Customer</span>
                )}
              </div>
            </div>

            {/* Sidebar Navigation */}
            <nav className={styles.sidebarNav} aria-label="Account navigation">
              {/* Profile Tab */}
              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === "profile" ? styles.sidebarBtnActive : ""}`}
                onClick={() => setActiveTab("profile")}
              >
                <div className={styles.sidebarBtnLeft}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>Profile</span>
                </div>
              </button>

              {/* My Orders Tab */}
              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === "orders" ? styles.sidebarBtnActive : ""}`}
                onClick={() => setActiveTab("orders")}
              >
                <div className={styles.sidebarBtnLeft}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  <span>My Orders</span>
                </div>
                {orders.length > 0 && (
                  <span className={styles.sidebarCount}>{orders.length}</span>
                )}
              </button>

              {/* My Messages Tab */}
              <button
                type="button"
                className={`${styles.sidebarBtn} ${activeTab === "messages" ? styles.sidebarBtnActive : ""}`}
                onClick={() => setActiveTab("messages")}
              >
                <div className={styles.sidebarBtnLeft}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>My Messages</span>
                </div>
                {repliedMessagesCount > 0 && (
                  <span className={styles.sidebarReplied}>{repliedMessagesCount}</span>
                )}
              </button>

              {/* Admin Panel Direct Button (Only for Admins) */}
              {account.isAdmin && (
                <a
                  href="/api/admin/bridge"
                  className={styles.adminBridgeLink}
                  title="Open Admin Dashboard"
                >
                  <div className={styles.sidebarBtnLeft}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="9" />
                      <rect x="14" y="3" width="7" height="5" />
                      <rect x="14" y="12" width="7" height="9" />
                      <rect x="3" y="16" width="7" height="5" />
                    </svg>
                    <span>Admin Panel</span>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              )}
            </nav>

            {/* Sidebar Footer: Sign Out */}
            <div className={styles.sidebarFooter}>
              {!confirmSignOut ? (
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(true)}
                  className={styles.signOutButton}
                  style={{ width: "100%" }}
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              ) : (
                <div className={styles.signOutConfirm} style={{ justifyContent: "center" }}>
                  <span>Sign out?</span>
                  <button type="button" onClick={handleSignOut} className={styles.signOutConfirmYes} disabled={signingOut}>Yes</button>
                  <button type="button" onClick={() => setConfirmSignOut(false)} className={styles.signOutConfirmNo}>Cancel</button>
                </div>
              )}
            </div>
          </aside>

          {/* ── Right Column: Dynamic Main View ── */}
          <main style={{ minWidth: 0 }}>
            {/* 1. Profile Tab Content */}
            {activeTab === "profile" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Account Details Card */}
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2>Account Information</h2>
                  </div>
                  <div className={styles.accountInfo}>
                    <div className={styles.infoRow}>
                      <span className={styles.label}>Full Name</span>
                      {editingName ? (
                        <div className={styles.nameEdit}>
                          <input
                            className={styles.nameInput}
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            autoFocus
                            maxLength={100}
                            disabled={savingName}
                          />
                          <button
                            type="button"
                            className={styles.nameSaveButton}
                            onClick={saveName}
                            disabled={savingName}
                          >
                            {savingName ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className={styles.nameCancelButton}
                            onClick={cancelEditingName}
                            disabled={savingName}
                          >
                            Cancel
                          </button>
                          {nameError && <p className={styles.nameError}>{nameError}</p>}
                        </div>
                      ) : (
                        <span className={styles.nameDisplay}>
                          <strong>{name}</strong>
                          <button
                            type="button"
                            className={styles.editIconButton}
                            onClick={startEditingName}
                            aria-label="Edit name"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                        </span>
                      )}
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.label}>Email Address</span>
                      <strong>{account.email}</strong>
                    </div>

                    <div className={styles.infoRow}>
                      <span className={styles.label}>Member Since</span>
                      <strong>{new Date(account.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
                    </div>

                    {account.isAdmin && (
                      <div className={styles.infoRow}>
                        <span className={styles.label}>Role</span>
                        <strong style={{ color: "#166534" }}>Store Administrator</strong>
                      </div>
                    )}
                  </div>

                  {/* Saved Delivery Addresses Section */}
                  <div className={styles.addressSection}>
                    <div className={styles.addressHeader}>
                      <div>
                        <h3>Saved Delivery Addresses</h3>
                        <span style={{ fontSize: 13, color: "#6b7280" }}>
                          Used for one-click checkout and automated delivery calculation.
                        </span>
                      </div>
                      {!showAddAddress && (
                        <button
                          type="button"
                          className={styles.addAddressBtn}
                          onClick={() => {
                            setShowAddAddress(true);
                            setAddressError("");
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Add New Address
                        </button>
                      )}
                    </div>

                    {/* Inline Add Address Form */}
                    {showAddAddress && (
                      <form className={styles.addressFormCard} onSubmit={handleCreateAddress}>
                        <h4 className={styles.addressFormTitle}>Add Delivery Address</h4>
                        <div className={styles.addressFormGrid}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>Recipient Name</label>
                            <input
                              className={styles.addressFormInput}
                              required
                              value={addressDraft.name}
                              onChange={(e) => setAddressDraft((d) => ({ ...d, name: e.target.value }))}
                              placeholder="Full Name"
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>Mobile Number</label>
                            <input
                              className={styles.addressFormInput}
                              required
                              type="tel"
                              value={addressDraft.phone}
                              onChange={(e) => setAddressDraft((d) => ({ ...d, phone: e.target.value }))}
                              placeholder="10-digit mobile"
                            />
                          </div>
                          <div className={styles.addressFormFull}>
                            <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>Street Address</label>
                            <input
                              className={styles.addressFormInput}
                              required
                              value={addressDraft.address}
                              onChange={(e) => setAddressDraft((d) => ({ ...d, address: e.target.value }))}
                              placeholder="House / Flat no., Street, Landmark"
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>City / District</label>
                            <input
                              className={styles.addressFormInput}
                              required
                              value={addressDraft.city}
                              onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                              placeholder="City / District"
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>State</label>
                            <input
                              className={styles.addressFormInput}
                              required
                              value={addressDraft.state}
                              onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))}
                              placeholder="State (e.g. Tamil Nadu)"
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontFamily: "'DM Mono',monospace", textTransform: "uppercase", color: "#6b7280", marginBottom: 4 }}>PIN Code</label>
                            <input
                              className={styles.addressFormInput}
                              required
                              type="text"
                              maxLength={6}
                              value={addressDraft.pincode}
                              onChange={(e) => setAddressDraft((d) => ({ ...d, pincode: e.target.value }))}
                              placeholder="6-digit PIN"
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <label className={styles.addressCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={addressDraft.isDefault}
                                onChange={(e) => setAddressDraft((d) => ({ ...d, isDefault: e.target.checked }))}
                              />
                              Set as default address
                            </label>
                          </div>
                        </div>

                        {addressError && (
                          <p style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: 12 }}>{addressError}</p>
                        )}

                        <div className={styles.addressFormActions}>
                          <button
                            type="button"
                            className={styles.addressFormCancelBtn}
                            onClick={() => {
                              setShowAddAddress(false);
                              setAddressError("");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className={styles.addressFormSaveBtn}
                            disabled={savingAddress}
                          >
                            {savingAddress ? "Saving…" : "Save Address"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Address List */}
                    {!addressLoaded ? (
                      <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading addresses…</p>
                    ) : addresses.length === 0 ? (
                      <div className={styles.savedAddressCard}>
                        <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                          No delivery address saved yet. You can click <strong>+ Add New Address</strong> above, or your address will be automatically saved when you place your first order.
                        </p>
                      </div>
                    ) : (
                      <div className={styles.addressGrid}>
                        {addresses.map((addr) => (
                          <div
                            key={addr.id}
                            className={`${styles.addressCard} ${addr.isDefault ? styles.addressCardDefault : ""}`}
                          >
                            <div>
                              <div className={styles.addressBadgeRow}>
                                {addr.isDefault && (
                                  <span className={styles.defaultBadge}>Default Address</span>
                                )}
                              </div>
                              <p className={styles.addressRecipient}>{addr.name}</p>
                              {addr.phone && <p className={styles.addressPhone}>{addr.phone}</p>}
                              <p className={styles.addressBody}>
                                {addr.address}<br />
                                {addr.city}, {addr.state} – {addr.pincode}
                              </p>
                            </div>
                            <div className={styles.addressCardActions}>
                              {!addr.isDefault && (
                                <button
                                  type="button"
                                  className={styles.setDefaultBtn}
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                >
                                  Set as Default
                                </button>
                              )}
                              <button
                                type="button"
                                className={styles.deleteAddressBtn}
                                onClick={() => handleDeleteAddress(addr.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* 2. My Orders Tab Content */}
            {activeTab === "orders" && (
              <section className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ margin: 0, font: "700 20px 'Playfair Display', serif", color: "var(--ink)" }}>
                    Order History ({orders.length})
                  </h2>
                  <Link href="/track" className={styles.textLink}>Track Order</Link>
                </div>

                {orders.length === 0 ? (
                  <div className={styles.emptyState}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                    </svg>
                    <h3>No orders yet</h3>
                    <p>Start shopping to see your orders here.</p>
                    <Link href="/shop" className={styles.button}>Browse Products</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {orders.map((order, idx) => (
                      <div
                        key={order.id}
                        style={{
                          padding: "20px 24px",
                          borderBottom: idx < orders.length - 1 ? "1px solid var(--line)" : "none",
                        }}
                      >
                        {/* Order Header Row */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                          <div>
                            <p style={{ margin: "0 0 4px", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.04em" }}>
                              {order.orderNumber}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
                              Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{
                              padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                              fontFamily: "'DM Mono',monospace", textTransform: "uppercase", letterSpacing: "0.04em",
                              ...({
                                placed:     { background: "#fef3c7", color: "#92400e" },
                                packed:     { background: "#dbeafe", color: "#1e40af" },
                                dispatched: { background: "#dcfce7", color: "#166534" },
                                delivered:  { background: "#d1fae5", color: "#065f46" },
                                cancelled:  { background: "#fee2e2", color: "#991b1b" },
                              } as Record<string, React.CSSProperties>)[order.orderStatus] ?? { background: "#f3f4f6", color: "#374151" }
                            }}>
                              {order.orderStatus}
                            </span>
                            {order.paymentMethod && (
                              <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "#6b7280", background: "#f3f4f6", borderRadius: 4, padding: "2px 8px" }}>
                                {(order.paymentMethod === "cod" || order.paymentMethod === "cash_on_delivery")
                                  ? "Cash on Delivery"
                                  : "Online Payment"}
                              </span>
                            )}
                            <strong style={{ fontSize: 15, fontFamily: "'DM Sans',sans-serif", color: "var(--ink)" }}>
                              {price.format(parseFloat(order.total))}
                            </strong>
                          </div>
                        </div>

                        {/* Product Chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {order.items.map((item) => (
                            <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                              <div
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  background: "var(--cream)", border: "1px solid var(--line)",
                                  borderRadius: 8, padding: "8px 12px",
                                  textAlign: "left", transition: "border-color 0.15s",
                                  maxWidth: 280,
                                }}
                              >
                                {item.product?.slug ? (
                                  <Link href={`/product/${item.product.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flex: 1, minWidth: 0 }}>
                                    {item.product?.image ? (
                                      <img src={item.product.image} alt={item.name} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)", flexShrink: 0 }} />
                                    ) : (
                                      <div style={{ width: 36, height: 36, background: "#f0ede8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                      </div>
                                    )}
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280", fontFamily: "'DM Mono',monospace" }}>{item.quantity} × {price.format(parseFloat(item.price))}</p>
                                    </div>
                                  </Link>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                    <div style={{ width: 36, height: 36, background: "#f0ede8", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280", fontFamily: "'DM Mono',monospace" }}>{item.quantity} × {price.format(parseFloat(item.price))}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Review Action */}
                              {order.orderStatus === "delivered" && (
                                item.productId && reviewedProductIds.includes(item.productId) ? (
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: "#166534", fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                    Reviewed
                                  </span>
                                ) : item.productId ? (
                                  reviewingItemId === item.id ? (
                                    <div style={{ marginTop: 8, padding: 12, background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, width: 280 }}>
                                      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            onClick={() => setReviewRating(star)}
                                            onMouseEnter={() => setReviewHovered(star)}
                                            onMouseLeave={() => setReviewHovered(0)}
                                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: (reviewHovered || reviewRating) >= star ? "#f59e0b" : "#d1d5db" }}
                                          >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                            </svg>
                                          </button>
                                        ))}
                                      </div>
                                      <textarea
                                        rows={2}
                                        value={reviewContent}
                                        onChange={(e) => setReviewContent(e.target.value)}
                                        placeholder="Share your thoughts..."
                                        style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 4, resize: "none", marginBottom: 6, boxSizing: "border-box" }}
                                      />
                                      {reviewError && <p style={{ margin: "0 0 6px", color: "#b91c1c", fontSize: 11 }}>{reviewError}</p>}
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <button
                                          type="button"
                                          onClick={() => submitReview(item.productId!)}
                                          disabled={reviewSubmitting}
                                          style={{ padding: "4px 10px", fontSize: 11, background: "var(--terracotta)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600 }}
                                        >
                                          {reviewSubmitting ? "Submitting…" : "Post"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setReviewingItemId(null)}
                                          style={{ padding: "4px 10px", fontSize: 11, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer" }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { setReviewingItemId(item.id); setReviewRating(0); setReviewContent(""); setReviewError(""); }}
                                      style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "3px 10px", background: "rgba(196,79,49,0.08)", border: "1px solid rgba(196,79,49,0.25)", borderRadius: 20, fontSize: 11, fontWeight: 600, color: "var(--terracotta)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", outline: "none" }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                      </svg>
                                      Review
                                    </button>
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDetailOrder(order)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 4, padding: "3px 10px", background: "rgba(196,79,49,0.08)", border: "1px solid rgba(196,79,49,0.25)", borderRadius: 20, fontSize: 11, fontWeight: 600, color: "var(--terracotta)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", outline: "none" }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                    Review
                                  </button>
                                )
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Order Action Buttons */}
                        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                          <button
                            type="button"
                            onClick={() => setDetailOrder(order)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}
                          >
                            View Order Details
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadInvoice(order.orderNumber)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}
                          >
                            Download Invoice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 3. My Messages Tab Content */}
            {activeTab === "messages" && (
              <section className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h2 style={{ margin: 0, font: "700 20px 'Playfair Display', serif", color: "var(--ink)" }}>
                    Support Inquiries
                  </h2>
                  <Link href="/contact" className={styles.textLink}>Send New Message</Link>
                </div>

                {!messagesLoaded ? (
                  <div style={{ padding: 36, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading messages…</div>
                ) : userMessages.length === 0 ? (
                  <div className={styles.emptyState} style={{ padding: "48px 24px" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: "0 auto 12px", display: "block", color: "#9ca3af" }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>No messages sent yet.</p>
                    <Link href="/contact" className={styles.button} style={{ marginTop: 16, display: "inline-flex" }}>Send a Message</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {userMessages.map((msg, idx) => {
                      const subjectLabels: Record<string, string> = { order: "Order Inquiry", product: "Product Question", bulk: "Bulk Orders", feedback: "Feedback", other: "Other" };
                      return (
                        <div key={msg.id} style={{ padding: "18px 24px", borderBottom: idx < userMessages.length - 1 ? "1px solid var(--line)" : "none" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                                {subjectLabels[msg.subject] ?? msg.subject}
                              </span>
                              {msg.adminReply && (
                                <span style={{ background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                                  Replied
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>
                              {new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>

                          <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 8, padding: "12px 14px", marginBottom: msg.adminReply ? 10 : 0, fontSize: 14, lineHeight: 1.7, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                            {msg.message}
                          </div>

                          {msg.adminReply && (
                            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px" }}>
                              <p style={{ margin: "0 0 6px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#166534" }}>
                                Reply from Raghul Delights
                                {msg.replyAt && <span style={{ marginLeft: 8, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                                  · {new Date(msg.replyAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>}
                              </p>
                              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#166534", whiteSpace: "pre-wrap" }}>{msg.adminReply}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

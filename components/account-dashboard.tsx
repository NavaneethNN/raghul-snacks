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

const statusBadgeStyles: Record<string, { bg: string; color: string }> = {
  placed: { bg: "#fef3c7", color: "#92400e" },
  packed: { bg: "#dbeafe", color: "#1e40af" },
  dispatched: { bg: "#dcfce7", color: "#166534" },
  shipped: { bg: "#dcfce7", color: "#166534" },
  delivered: { bg: "#d1fae5", color: "#065f46" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

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

  // Messages state
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const loadAddresses = useCallback(() => {
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d: { addresses?: SavedAddress[] }) => {
        if (d.addresses) setAddresses(d.addresses);
      })
      .catch(() => {})
      .finally(() => setAddressLoaded(true));
  }, []);

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
      const data = (await response.json()) as { account?: { name: string }; error?: string };
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
    if (!reviewRating) {
      setReviewError("Please select a rating.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating: reviewRating, content: reviewContent.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
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
      alert(
        `${addedCount} item${addedCount > 1 ? "s" : ""} added to cart. ${skippedCount} item${
          skippedCount > 1 ? "s are" : " is"
        } no longer available.`
      );
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
      <div className={styles.contentWrapper}>
        {/* Page Top Heading */}
        <header className={styles.pageHeader}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span className={styles.pageBadge}>Customer Portal</span>
            <Link
              href="/shop"
              className={styles.textLink}
              style={{ fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Back to Store</span>
            </Link>
          </div>
          <h1 className={styles.pageTitle}>My Account</h1>
          <p className={styles.pageSubtitle}>
            Welcome back, <strong>{name}</strong>. Manage your profile, view orders, and track deliveries.
          </p>
        </header>

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

        {/* Profile Hero Card */}
        <section className={styles.profileCard} aria-label="Customer profile summary">
          <div className={styles.profileTopRow}>
            {/* User Identity Group */}
            <div className={styles.profileUserGroup}>
              <div className={styles.profileAvatar}>{initials || "U"}</div>
              <div className={styles.profileMeta}>
                <div className={styles.profileNameRow}>
                  <span className={styles.profileName}>{name}</span>
                  {!editingName && (
                    <button
                      type="button"
                      className={styles.editNameBtn}
                      onClick={startEditingName}
                      aria-label="Edit name"
                      title="Edit name"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                  )}
                </div>

                {editingName && (
                  <div className={styles.nameEditBox}>
                    <div className={styles.nameEditControls}>
                      <input
                        className={styles.nameInput}
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        autoFocus
                        maxLength={100}
                        disabled={savingName}
                        placeholder="Your full name"
                      />
                      <button
                        type="button"
                        className={styles.nameSaveBtn}
                        onClick={saveName}
                        disabled={savingName}
                      >
                        {savingName ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className={styles.nameCancelBtn}
                        onClick={cancelEditingName}
                        disabled={savingName}
                      >
                        Cancel
                      </button>
                    </div>
                    {nameError && <p className={styles.nameError}>{nameError}</p>}
                  </div>
                )}

                <span className={styles.profileEmail}>{account.email}</span>

                <div className={styles.profileBadges}>
                  {account.isAdmin ? (
                    <span className={styles.roleBadgeAdmin}>Store Admin</span>
                  ) : (
                    <span className={styles.roleBadgeCustomer}>Customer</span>
                  )}
                  <span className={styles.memberSinceChip}>
                    Member since {new Date(account.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions (Admin Portal + Sign Out) */}
            <div className={styles.profileActions}>
              {account.isAdmin && (
                <a
                  href="/api/admin/bridge"
                  className={styles.adminBridgeButton}
                  title="Direct access to Store Management"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                  <span>Admin Dashboard</span>
                </a>
              )}

              {!confirmSignOut ? (
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(true)}
                  className={styles.signOutBtn}
                  disabled={signingOut}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>{signingOut ? "Signing out…" : "Sign Out"}</span>
                </button>
              ) : (
                <div className={styles.signOutConfirm}>
                  <span>Sign out?</span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={styles.signOutConfirmYes}
                    disabled={signingOut}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmSignOut(false)}
                    className={styles.signOutConfirmNo}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Metric Strip */}
          <div className={styles.statsStrip}>
            <button
              type="button"
              className={styles.statTile}
              onClick={() => setActiveTab("orders")}
              title="View your orders"
            >
              <span className={styles.statValue}>{orders.length}</span>
              <span className={styles.statLabel}>Total Orders</span>
            </button>
            <button
              type="button"
              className={styles.statTile}
              onClick={() => setActiveTab("profile")}
              title="Manage delivery addresses"
            >
              <span className={styles.statValue}>
                {addressLoaded ? addresses.length : "—"}
              </span>
              <span className={styles.statLabel}>Saved Addresses</span>
            </button>
            <button
              type="button"
              className={styles.statTile}
              onClick={() => setActiveTab("messages")}
              title="Customer support inquiries"
            >
              <span className={styles.statValue}>
                {repliedMessagesCount > 0 ? `${repliedMessagesCount} New` : userMessages.length}
              </span>
              <span className={styles.statLabel}>Support Messages</span>
            </button>
          </div>
        </section>

        {/* Tab Navigation (Seamless, Full Width, Zero Mobile Clipping) */}
        <nav className={styles.tabsContainer} aria-label="Account navigation">
          <div className={styles.tabsList}>
            {/* Tab 1: Profile & Addresses */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "profile"}
              className={`${styles.tabButton} ${activeTab === "profile" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profile & Addresses</span>
            </button>

            {/* Tab 2: My Orders */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "orders"}
              className={`${styles.tabButton} ${activeTab === "orders" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>My Orders</span>
              {orders.length > 0 && <span className={styles.tabBadge}>{orders.length}</span>}
            </button>

            {/* Tab 3: Support & Messages */}
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "messages"}
              className={`${styles.tabButton} ${activeTab === "messages" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("messages")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Support & Inquiries</span>
              {repliedMessagesCount > 0 ? (
                <span className={styles.tabBadgeGreen}>{repliedMessagesCount} New Reply</span>
              ) : userMessages.length > 0 ? (
                <span className={styles.tabBadge}>{userMessages.length}</span>
              ) : null}
            </button>

            {/* Admin portal shortcut for admins */}
            {account.isAdmin && (
              <a
                href="/api/admin/bridge"
                className={styles.tabButtonAdmin}
                title="Open Admin Management Panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="3" width="7" height="9" />
                  <rect x="14" y="3" width="7" height="5" />
                  <rect x="14" y="12" width="7" height="9" />
                  <rect x="3" y="16" width="7" height="5" />
                </svg>
                <span>Admin Panel</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        </nav>

        {/* ── Tab 1: Profile & Addresses ── */}
        {activeTab === "profile" && (
          <main className={styles.panel}>
            {/* Account Details Card */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <h2 className={styles.cardTitle}>Account Details</h2>
                  <p className={styles.cardSubtitle}>Your personal contact information and membership tier</p>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Full Name</span>
                  <span className={styles.infoValue}>{name}</span>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Email Address</span>
                  <span className={styles.infoValue}>{account.email}</span>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Member Since</span>
                  <span className={styles.infoValue}>
                    {new Date(account.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className={styles.infoCell}>
                  <span className={styles.infoLabel}>Account Role</span>
                  <span className={styles.infoValue} style={{ color: account.isAdmin ? "#166534" : "inherit" }}>
                    {account.isAdmin ? "Store Administrator" : "Customer"}
                  </span>
                </div>
              </div>
            </section>

            {/* Saved Delivery Addresses Card */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <h2 className={styles.cardTitle}>Saved Delivery Addresses</h2>
                  <p className={styles.cardSubtitle}>
                    Used for automated courier rate calculation and fast 1-click checkout.
                  </p>
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
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Add New Address</span>
                  </button>
                )}
              </div>

              {/* Inline Add Address Form */}
              {showAddAddress && (
                <form className={styles.addressFormCard} onSubmit={handleCreateAddress}>
                  <h3 className={styles.addressFormTitle}>Add New Delivery Address</h3>
                  <div className={styles.addressFormGrid}>
                    <div>
                      <label className={styles.fieldLabel}>Recipient Name</label>
                      <input
                        className={styles.addressFormInput}
                        required
                        value={addressDraft.name}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Mobile Number</label>
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
                      <label className={styles.fieldLabel}>Street Address</label>
                      <input
                        className={styles.addressFormInput}
                        required
                        value={addressDraft.address}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, address: e.target.value }))}
                        placeholder="Flat / Door no., Building, Street name, Landmark"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>City / District</label>
                      <input
                        className={styles.addressFormInput}
                        required
                        value={addressDraft.city}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>State</label>
                      <input
                        className={styles.addressFormInput}
                        required
                        value={addressDraft.state}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>PIN Code</label>
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
                    <div className={styles.addressFormFull}>
                      <label className={styles.addressCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={addressDraft.isDefault}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, isDefault: e.target.checked }))}
                        />
                        <span>Set as default delivery address</span>
                      </label>
                    </div>
                  </div>

                  {addressError && (
                    <p style={{ margin: "12px 0 0", color: "#dc2626", fontSize: 13, fontWeight: 500 }}>
                      {addressError}
                    </p>
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
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading your saved addresses…</p>
              ) : addresses.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>No addresses saved yet</h3>
                  <p className={styles.emptyStateText}>
                    Add your delivery address for faster checkout, or it will be saved automatically when you place an order.
                  </p>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={() => setShowAddAddress(true)}
                  >
                    + Add Your First Address
                  </button>
                </div>
              ) : (
                <div className={styles.addressGrid}>
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`${styles.addressCard} ${addr.isDefault ? styles.addressCardDefault : ""}`}
                    >
                      <div className={styles.addressTop}>
                        {addr.isDefault && <span className={styles.defaultBadge}>Default Address</span>}
                        <h4 className={styles.addressRecipient}>{addr.name}</h4>
                        {addr.phone && (
                          <p className={styles.addressPhone}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {addr.phone}
                          </p>
                        )}
                        <p className={styles.addressBody}>
                          {addr.address}
                          <br />
                          {addr.city}, {addr.state} – <strong>{addr.pincode}</strong>
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
            </section>
          </main>
        )}

        {/* ── Tab 2: My Orders ── */}
        {activeTab === "orders" && (
          <main className={styles.panel}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <h2 className={styles.cardTitle}>Order History ({orders.length})</h2>
                  <p className={styles.cardSubtitle}>View tracking, past purchases, invoices and re-order easily</p>
                </div>
                <Link href="/track" className={styles.textLink}>
                  <span>Track Consignment</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>No orders placed yet</h3>
                  <p className={styles.emptyStateText}>
                    Explore our handcrafted traditional sweets, savouries, and podis freshly made in small batches.
                  </p>
                  <Link href="/shop" className={styles.btnPrimary}>
                    Browse Snacks & Combos
                  </Link>
                </div>
              ) : (
                <div className={styles.ordersList}>
                  {orders.map((order) => {
                    const statusKey = order.orderStatus.toLowerCase();
                    const statusColor = statusBadgeStyles[statusKey] ?? { bg: "#f3f4f6", color: "#374151" };

                    return (
                      <article key={order.id} className={styles.orderCard}>
                        {/* Order Header Meta */}
                        <div className={styles.orderHeader}>
                          <div className={styles.orderNumberMeta}>
                            <span className={styles.orderNumber}>{order.orderNumber}</span>
                            <span className={styles.orderDate}>
                              Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                          </div>

                          <div className={styles.orderHeaderRight}>
                            <span
                              className={styles.orderStatusBadge}
                              style={{ background: statusColor.bg, color: statusColor.color }}
                            >
                              {order.orderStatus}
                            </span>
                            {order.paymentMethod && (
                              <span className={styles.paymentChip}>
                                {order.paymentMethod === "cod" || order.paymentMethod === "cash_on_delivery"
                                  ? "COD"
                                  : "Paid Online"}
                              </span>
                            )}
                            <strong className={styles.orderTotal}>
                              {price.format(parseFloat(order.total))}
                            </strong>
                          </div>
                        </div>

                        {/* Items Grid */}
                        <div className={styles.orderItemsGrid}>
                          {order.items.map((item) => (
                            <div key={item.id} className={styles.orderItemChip}>
                              {item.product?.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.name}
                                  className={styles.itemThumb}
                                />
                              ) : (
                                <div className={styles.itemThumbFallback}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                  </svg>
                                </div>
                              )}

                              <div className={styles.itemInfo}>
                                {item.product?.slug ? (
                                  <Link href={`/product/${item.product.slug}`} className={styles.itemName}>
                                    {item.name}
                                  </Link>
                                ) : (
                                  <p className={styles.itemName}>{item.name}</p>
                                )}
                                <p className={styles.itemMeta}>
                                  {item.quantity} × {price.format(parseFloat(item.price))}
                                  {item.weight ? ` · ${item.weight}` : ""}
                                </p>

                                {/* Review prompt if delivered */}
                                {order.orderStatus.toLowerCase() === "delivered" && (
                                  <div className={styles.reviewActionRow}>
                                    {item.productId && reviewedProductIds.includes(item.productId) ? (
                                      <span className={styles.reviewedBadge}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Reviewed
                                      </span>
                                    ) : item.productId ? (
                                      reviewingItemId === item.id ? (
                                        <div className={styles.inlineReviewCard}>
                                          <div className={styles.starRatingRow}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                key={star}
                                                type="button"
                                                className={styles.starBtn}
                                                onClick={() => setReviewRating(star)}
                                                onMouseEnter={() => setReviewHovered(star)}
                                                onMouseLeave={() => setReviewHovered(0)}
                                                style={{ color: (reviewHovered || reviewRating) >= star ? "#f59e0b" : "#d1d5db" }}
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
                                            placeholder="Write your review here…"
                                            className={styles.reviewTextarea}
                                          />
                                          {reviewError && (
                                            <p style={{ margin: "0 0 6px", color: "#dc2626", fontSize: 11 }}>{reviewError}</p>
                                          )}
                                          <div className={styles.reviewActionsRow}>
                                            <button
                                              type="button"
                                              onClick={() => submitReview(item.productId!)}
                                              disabled={reviewSubmitting}
                                              className={styles.nameSaveBtn}
                                            >
                                              {reviewSubmitting ? "Posting…" : "Post Review"}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setReviewingItemId(null)}
                                              className={styles.nameCancelBtn}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          className={styles.reviewPromptBtn}
                                          onClick={() => {
                                            setReviewingItemId(item.id);
                                            setReviewRating(0);
                                            setReviewContent("");
                                            setReviewError("");
                                          }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                          </svg>
                                          <span>Review</span>
                                        </button>
                                      )
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Actions Footer */}
                        <div className={styles.orderActionsFooter}>
                          <button
                            type="button"
                            className={styles.btnDetails}
                            onClick={() => setDetailOrder(order)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            className={styles.btnInvoice}
                            onClick={() => downloadInvoice(order.orderNumber)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Download Invoice</span>
                          </button>
                          <button
                            type="button"
                            className={styles.btnBuyAgain}
                            onClick={() => handleBuyAgain(order)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 4v6h6" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                            <span>Buy Again</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </main>
        )}

        {/* ── Tab 3: Support & Messages ── */}
        {activeTab === "messages" && (
          <main className={styles.panel}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <h2 className={styles.cardTitle}>Customer Support & Inquiries</h2>
                  <p className={styles.cardSubtitle}>
                    Direct messages with our team regarding your orders, special packaging, and product inquiries.
                  </p>
                </div>
                <Link href="/contact" className={styles.addAddressBtn}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Send New Message</span>
                </Link>
              </div>

              {!messagesLoaded ? (
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading your messages…</p>
              ) : userMessages.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>No messages sent yet</h3>
                  <p className={styles.emptyStateText}>
                    Need assistance with an existing order or want to inquire about bulk corporate gifting? We are here to help.
                  </p>
                  <Link href="/contact" className={styles.btnPrimary}>
                    Contact Customer Care
                  </Link>
                </div>
              ) : (
                <div className={styles.messagesList}>
                  {userMessages.map((msg) => {
                    const subjectLabels: Record<string, string> = {
                      order: "Order Inquiry",
                      product: "Product Question",
                      bulk: "Bulk Orders",
                      feedback: "Feedback",
                      other: "Other",
                    };

                    return (
                      <div key={msg.id} className={styles.messageCard}>
                        <div className={styles.messageHeader}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span className={styles.messageSubjectBadge}>
                              {subjectLabels[msg.subject] ?? msg.subject}
                            </span>
                            {msg.adminReply ? (
                              <span className={styles.messageRepliedBadge}>Replied by Store</span>
                            ) : (
                              <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "'DM Mono',monospace" }}>
                                Awaiting Reply
                              </span>
                            )}
                          </div>
                          <span className={styles.messageDate}>
                            {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className={styles.messageBody}>{msg.message}</div>

                        {msg.adminReply && (
                          <div className={styles.adminReplyBubble}>
                            <p className={styles.replyHeader}>
                              Response from Raghul Delights
                              {msg.replyAt && (
                                <span style={{ marginLeft: 8, fontWeight: 400, color: "#166534" }}>
                                  · {new Date(msg.replyAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </p>
                            <p className={styles.replyText}>{msg.adminReply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick WhatsApp Support Banner */}
            <div className={styles.supportBanner}>
              <div>
                <strong style={{ display: "block", color: "#166534", fontSize: 14 }}>
                  Need instant assistance?
                </strong>
                <span style={{ fontSize: 13, color: "#15803d" }}>
                  Chat directly with our kitchen and packaging team on WhatsApp for quick updates.
                </span>
              </div>
              <a
                href="https://wa.me/919940893306?text=Hi%20Raghul%20Delights,%20I%20have%20an%20inquiry%20regarding%20my%20account"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  background: "#22c55e",
                  color: "#ffffff",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Chat on WhatsApp
              </a>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

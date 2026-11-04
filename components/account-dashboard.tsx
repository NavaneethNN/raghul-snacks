"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { OrderDetailModal } from "@/components/order-detail-modal";
import { normalizeIndianPhone, isValidIndianPhone, formatIndianPhone } from "@/lib/phone";
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
  shippingStatus?: string | null;
  awbCode?: string | null;
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

type TabType = "orders" | "addresses" | "profile" | "messages";

export function AccountDashboard({ account, orders }: AccountDashboardProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabType | null;
      if (tabParam && ["orders", "addresses", "profile", "messages"].includes(tabParam)) {
        return tabParam;
      }
    }
    return "orders";
  });
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  // Name inline edit state
  const [name, setName] = useState(account.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Order modal & reviews state
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [reviewedProductIds, setReviewedProductIds] = useState<number[]>([]);
  const [reviewingItemId, setReviewingItemId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHovered, setReviewHovered] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Saved addresses state
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

  // Customer care messages state
  const [userMessages, setUserMessages] = useState<UserMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  // Listen to popstate when user navigates forward/backward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabType | null;
      if (tabParam && ["orders", "addresses", "profile", "messages"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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
    if (!addressDraft.phone.trim() || !isValidIndianPhone(addressDraft.phone)) {
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
        body: JSON.stringify({ ...addressDraft, phone: normalizeIndianPhone(addressDraft.phone) }),
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
    if (!confirm("Are you sure you want to remove this delivery address?")) return;
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
      setReviewError("Please select a star rating.");
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
      alert("No items found in this order.");
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
      alert("These items are currently out of stock or no longer available.");
      return;
    }
    if (skippedCount > 0) {
      alert(
        `${addedCount} item${addedCount > 1 ? "s" : ""} added to your cart. ${skippedCount} item${
          skippedCount > 1 ? "s are" : " is"
        } currently unavailable.`
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

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === "delivered") return styles.statusDelivered;
    if (s === "dispatched" || s === "shipped") return styles.statusDispatched;
    if (s === "packed") return styles.statusPacked;
    if (s === "cancelled") return styles.statusCancelled;
    return styles.statusPlaced;
  };

  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Top Header & Breadcrumb */}
        <div className={styles.topNavRow}>
          <Link href="/shop" className={styles.backLink}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Back to Store</span>
          </Link>
          <span className={styles.portalPill}>
            <span>✦</span> Customer Account
          </span>
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

        {/* Sign Out Confirmation Modal */}
        {confirmSignOut && (
          <div className={styles.modalBackdrop} onClick={() => setConfirmSignOut(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>Sign Out</h3>
              <p className={styles.modalText}>
                Are you sure you want to sign out of your Raghul Delights account? You can log back in anytime with your email.
              </p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setConfirmSignOut(false)}
                  disabled={signingOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  style={{ background: "#dc2626" }}
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? "Signing out…" : "Yes, Sign Out"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Artisanal Hero Profile Card */}
        <section className={styles.heroCard} aria-label="Customer profile summary">
          <div className={styles.heroTopRow}>
            <div className={styles.heroUserGroup}>
              <div className={styles.heroAvatar}>{initials || "U"}</div>
              <div className={styles.heroMeta}>
                <p className={styles.heroSalutation}>Namaste &amp; Welcome</p>
                <div className={styles.heroNameRow}>
                  <h1 className={styles.heroName}>{name}</h1>
                  {!editingName && (
                    <button
                      type="button"
                      className={styles.editNameTrigger}
                      onClick={startEditingName}
                      aria-label="Edit name"
                      title="Edit name"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                  )}
                </div>

                {editingName && (
                  <div className={styles.nameEditBox}>
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
                    {nameError && <p className={styles.nameErrorText}>{nameError}</p>}
                  </div>
                )}

                <div className={styles.heroSubRow}>
                  <span className={styles.heroEmail}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {account.email}
                  </span>
                  <span className={styles.verifiedChip}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verified Customer
                  </span>
                  {account.isAdmin && (
                    <span className={styles.adminRoleChip}>
                      ★ Store Administrator
                    </span>
                  )}
                  <span className={styles.memberSinceText}>
                    Member since {new Date(account.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.heroActionsGroup}>
              {account.isAdmin && (
                <a
                  href="/api/admin/bridge"
                  className={styles.adminPortalBtn}
                  title="Direct access to Store Management Panel"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" />
                    <rect x="14" y="3" width="7" height="5" />
                    <rect x="14" y="12" width="7" height="9" />
                    <rect x="3" y="16" width="7" height="5" />
                  </svg>
                  <span>Admin Panel</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setConfirmSignOut(true)}
                className={styles.signOutGhostBtn}
                disabled={signingOut}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Interactive Metric Tiles (Seamlessly connected to tabs) */}
          <div className={styles.metricsGrid}>
            <button
              type="button"
              className={`${styles.metricCard} ${activeTab === "orders" ? styles.metricCardActive : ""}`}
              onClick={() => setActiveTab("orders")}
              title="View all orders and track shipments"
            >
              <div className={styles.metricIconWrap} style={{ background: "rgba(201, 95, 59, 0.1)", color: "var(--terracotta, #c95f3b)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <div className={styles.metricInfo}>
                <span className={styles.metricValue}>{orders.length}</span>
                <span className={styles.metricLabel}>Total Orders</span>
              </div>
              <span className={styles.metricHint}>View →</span>
            </button>

            <button
              type="button"
              className={`${styles.metricCard} ${activeTab === "addresses" ? styles.metricCardActive : ""}`}
              onClick={() => setActiveTab("addresses")}
              title="Manage delivery addresses"
            >
              <div className={styles.metricIconWrap} style={{ background: "rgba(229, 165, 47, 0.12)", color: "#b45309" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className={styles.metricInfo}>
                <span className={styles.metricValue}>{addressLoaded ? addresses.length : "—"}</span>
                <span className={styles.metricLabel}>Saved Addresses</span>
              </div>
              <span className={styles.metricHint}>Manage →</span>
            </button>

            <button
              type="button"
              className={`${styles.metricCard} ${activeTab === "messages" ? styles.metricCardActive : ""}`}
              onClick={() => setActiveTab("messages")}
              title="Customer support and inquiries"
            >
              <div className={styles.metricIconWrap} style={{ background: "rgba(34, 197, 94, 0.12)", color: "#166534" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className={styles.metricInfo}>
                <span className={styles.metricValue}>
                  {repliedMessagesCount > 0 ? `${repliedMessagesCount} New` : userMessages.length}
                </span>
                <span className={styles.metricLabel}>Support Messages</span>
              </div>
              <span className={styles.metricHint}>Open →</span>
            </button>
          </div>
        </section>

        {/* Segmented Tab Navigation */}
        <nav className={styles.tabNavWrapper} aria-label="Account sections">
          <div className={styles.tabNavList}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "orders"}
              className={`${styles.tabItem} ${activeTab === "orders" ? styles.tabItemActive : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>My Orders</span>
              {orders.length > 0 && <span className={styles.tabItemBadge}>{orders.length}</span>}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "addresses"}
              className={`${styles.tabItem} ${activeTab === "addresses" ? styles.tabItemActive : ""}`}
              onClick={() => setActiveTab("addresses")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Saved Addresses</span>
              {addresses.length > 0 && <span className={styles.tabItemBadge}>{addresses.length}</span>}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "profile"}
              className={`${styles.tabItem} ${activeTab === "profile" ? styles.tabItemActive : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profile &amp; Security</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "messages"}
              className={`${styles.tabItem} ${activeTab === "messages" ? styles.tabItemActive : ""}`}
              onClick={() => setActiveTab("messages")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Customer Care</span>
              {repliedMessagesCount > 0 ? (
                <span className={styles.tabItemBadgeGreen}>{repliedMessagesCount} New Reply</span>
              ) : userMessages.length > 0 ? (
                <span className={styles.tabItemBadge}>{userMessages.length}</span>
              ) : null}
            </button>
          </div>
        </nav>

        {/* ── TAB 1: Orders & Purchases ── */}
        {activeTab === "orders" && (
          <main className={styles.panel}>
            <section className={styles.contentCard}>
              <div className={styles.contentCardHeader}>
                <div className={styles.cardHeadingGroup}>
                  <h2 className={styles.cardTitle}>Order History ({orders.length})</h2>
                  <p className={styles.cardSubtitle}>
                    View tracking, past purchases, invoices and re-order freshly prepared batches easily.
                  </p>
                </div>
                <Link href="/track" className={styles.cardHeaderAction}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  <span>Track Consignment</span>
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>No orders placed yet</h3>
                  <p className={styles.emptyStateText}>
                    Explore our handcrafted traditional sweets, savouries, and podis freshly made in small batches with cold-pressed oils.
                  </p>
                  <Link href="/shop" className={styles.btnPrimary}>
                    Browse Fresh Snacks &amp; Combos
                  </Link>
                </div>
              ) : (
                <div className={styles.ordersList}>
                  {orders.map((order) => {
                    return (
                      <article key={order.id} className={styles.orderCard}>
                        {/* Order Header Meta */}
                        <div className={styles.orderCardHeader}>
                          <div className={styles.orderMetaGroup}>
                            <span className={styles.orderNumberTag}>Order #{order.orderNumber}</span>
                            <span className={styles.orderDateText}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {" · "}
                              {order.items.length} {order.items.length === 1 ? "item" : "items"}
                            </span>
                          </div>

                          <div className={styles.orderPriceStatusGroup}>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.orderStatus)}`}>
                              {order.orderStatus.toLowerCase() === "delivered" && "✓ "}
                              {order.orderStatus}
                            </span>
                            {order.paymentMethod && (
                              <span className={styles.paymentTag}>
                                {order.paymentMethod === "cod" || order.paymentMethod === "cash_on_delivery"
                                  ? "COD"
                                  : "Prepaid"}
                              </span>
                            )}
                            <span className={styles.orderTotalAmount}>
                              {price.format(parseFloat(order.total))}
                            </span>
                          </div>
                        </div>

                        {/* Order Items Preview */}
                        <div className={styles.orderItemsList}>
                          {order.items.map((item) => (
                            <div key={item.id} className={styles.orderItemRow}>
                              {item.product?.image ? (
                                <Image
                                  src={item.product.image}
                                  alt={item.name}
                                  width={52}
                                  height={52}
                                  unoptimized
                                  className={styles.itemThumbImage}
                                />
                              ) : (
                                <div className={styles.itemThumbFallback}>
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                  </svg>
                                </div>
                              )}

                              <div className={styles.itemDetailMeta}>
                                {item.product?.slug ? (
                                  <Link href={`/product/${item.product.slug}`} className={styles.itemTitleLink}>
                                    {item.name}
                                  </Link>
                                ) : (
                                  <span className={styles.itemTitleLink}>{item.name}</span>
                                )}
                                <div className={styles.itemQtyWeight}>
                                  <span>
                                    Qty: <strong>{item.quantity}</strong> × {price.format(parseFloat(item.price))}
                                  </span>
                                  {item.weight && <span className={styles.weightPill}>{item.weight}</span>}
                                </div>

                                {/* Review prompt if order is delivered */}
                                {order.orderStatus.toLowerCase() === "delivered" && item.productId && (
                                  <div style={{ marginTop: 6 }}>
                                    {reviewedProductIds.includes(item.productId) ? (
                                      <span className={styles.reviewedBadge}>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Reviewed
                                      </span>
                                    ) : reviewingItemId === item.id ? (
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
                                              aria-label={`${star} star`}
                                            >
                                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                              </svg>
                                            </button>
                                          ))}
                                        </div>
                                        <textarea
                                          rows={2}
                                          value={reviewContent}
                                          onChange={(e) => setReviewContent(e.target.value)}
                                          placeholder="Share your experience with this snack…"
                                          className={styles.reviewTextarea}
                                        />
                                        {reviewError && (
                                          <p style={{ margin: "0 0 6px", color: "#dc2626", fontSize: 12 }}>{reviewError}</p>
                                        )}
                                        <div className={styles.reviewActionsRow}>
                                          <button
                                            type="button"
                                            onClick={() => submitReview(item.productId!)}
                                            disabled={reviewSubmitting}
                                            className={styles.btnPrimary}
                                            style={{ padding: "6px 14px", fontSize: 12 }}
                                          >
                                            {reviewSubmitting ? "Posting…" : "Post Review"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setReviewingItemId(null)}
                                            className={styles.btnSecondary}
                                            style={{ padding: "6px 12px", fontSize: 12 }}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className={styles.writeReviewBtn}
                                        onClick={() => {
                                          setReviewingItemId(item.id);
                                          setReviewRating(0);
                                          setReviewContent("");
                                          setReviewError("");
                                        }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                        <span>Write a Review</span>
                                      </button>
                                    )}
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
                            className={styles.btnDetailsAction}
                            onClick={() => setDetailOrder(order)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="16" x2="12" y2="12" />
                              <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>View Order Details</span>
                          </button>

                          <button
                            type="button"
                            className={styles.btnInvoiceAction}
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
                            className={styles.btnBuyAgainAction}
                            onClick={() => handleBuyAgain(order)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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

        {/* ── TAB 2: Saved Delivery Addresses ── */}
        {activeTab === "addresses" && (
          <main className={styles.panel}>
            <section className={styles.contentCard}>
              <div className={styles.contentCardHeader}>
                <div className={styles.cardHeadingGroup}>
                  <h2 className={styles.cardTitle}>Saved Delivery Addresses</h2>
                  <p className={styles.cardSubtitle}>
                    Addresses saved here will automatically pre-fill at checkout for swift 1-click ordering.
                  </p>
                </div>
                {!showAddAddress && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
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
                      <label className={styles.fieldLabel}>Recipient Name *</label>
                      <input
                        className={styles.formInput}
                        required
                        value={addressDraft.name}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Full Name of recipient"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>Mobile Number *</label>
                      <input
                        className={styles.formInput}
                        required
                        type="tel"
                        value={addressDraft.phone}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, phone: e.target.value }))}
                        onBlur={() => {
                          if (addressDraft.phone && isValidIndianPhone(addressDraft.phone)) {
                            setAddressDraft((d) => ({ ...d, phone: normalizeIndianPhone(d.phone) }));
                          }
                        }}
                        placeholder="10-digit mobile (e.g. 98765 43210)"
                      />
                    </div>
                    <div className={styles.formFullRow}>
                      <label className={styles.fieldLabel}>Street Address *</label>
                      <input
                        className={styles.formInput}
                        required
                        value={addressDraft.address}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, address: e.target.value }))}
                        placeholder="Flat / Door no., Building, Street name, Landmark"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>City / District *</label>
                      <input
                        className={styles.formInput}
                        required
                        value={addressDraft.city}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>State *</label>
                      <input
                        className={styles.formInput}
                        required
                        value={addressDraft.state}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, state: e.target.value }))}
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className={styles.fieldLabel}>6-Digit PIN Code *</label>
                      <input
                        className={styles.formInput}
                        required
                        type="text"
                        maxLength={6}
                        value={addressDraft.pincode}
                        onChange={(e) => setAddressDraft((d) => ({ ...d, pincode: e.target.value }))}
                        placeholder="e.g. 600028"
                      />
                    </div>
                    <div className={styles.formFullRow}>
                      <label className={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={addressDraft.isDefault}
                          onChange={(e) => setAddressDraft((d) => ({ ...d, isDefault: e.target.checked }))}
                        />
                        <span>Set as my default delivery address</span>
                      </label>
                    </div>
                  </div>

                  {addressError && <div className={styles.formErrorBanner}>{addressError}</div>}

                  <div className={styles.formActionsRow}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => {
                        setShowAddAddress(false);
                        setAddressError("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.btnPrimary}
                      disabled={savingAddress}
                    >
                      {savingAddress ? "Saving Address…" : "Save Address"}
                    </button>
                  </div>
                </form>
              )}

              {/* Address List */}
              {!addressLoaded ? (
                <p style={{ fontSize: 14, color: "#a8a29e", margin: 0 }}>Loading your saved addresses…</p>
              ) : addresses.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>No addresses saved yet</h3>
                  <p className={styles.emptyStateText}>
                    Add your delivery address for fast 1-click checkout, or it will be automatically saved whenever you place an order.
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
                      <div>
                        {addr.isDefault && (
                          <span className={styles.defaultAddressBadge}>
                            ★ Default Delivery Address
                          </span>
                        )}
                        <h4 className={styles.addressRecipientName}>{addr.name}</h4>
                        {addr.phone && (
                          <p className={styles.addressPhoneText}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {formatIndianPhone(addr.phone)}
                          </p>
                        )}
                        <p className={styles.addressBodyText}>
                          {addr.address}
                          <br />
                          {addr.city}, {addr.state}
                        </p>
                        <span className={styles.pincodeHighlight}>PIN: {addr.pincode}</span>
                      </div>

                      <div className={styles.addressCardActions}>
                        {!addr.isDefault ? (
                          <button
                            type="button"
                            className={styles.setDefaultActionBtn}
                            onClick={() => handleSetDefaultAddress(addr.id)}
                          >
                            Set as Default
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>Active Default</span>
                        )}
                        <button
                          type="button"
                          className={styles.deleteAddressActionBtn}
                          onClick={() => handleDeleteAddress(addr.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
        )}

        {/* ── TAB 3: Profile & Security ── */}
        {activeTab === "profile" && (
          <main className={styles.panel}>
            <section className={styles.contentCard}>
              <div className={styles.contentCardHeader}>
                <div className={styles.cardHeadingGroup}>
                  <h2 className={styles.cardTitle}>Account &amp; Personal Information</h2>
                  <p className={styles.cardSubtitle}>Your contact credentials, membership tier and security preferences.</p>
                </div>
              </div>

              <div className={styles.profileDetailsGrid}>
                <div className={styles.detailTile}>
                  <span className={styles.detailTileLabel}>Full Name</span>
                  <span className={styles.detailTileValue}>{name}</span>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.detailTileLabel}>Email Address</span>
                  <span className={styles.detailTileValue}>{account.email}</span>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.detailTileLabel}>Member Since</span>
                  <span className={styles.detailTileValue}>
                    {new Date(account.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className={styles.detailTile}>
                  <span className={styles.detailTileLabel}>Account Role</span>
                  <span className={styles.detailTileValue} style={{ color: account.isAdmin ? "#166534" : "inherit" }}>
                    {account.isAdmin ? "Store Administrator" : "Verified Customer"}
                  </span>
                </div>
              </div>
            </section>

            <section className={styles.contentCard}>
              <div className={styles.contentCardHeader}>
                <div className={styles.cardHeadingGroup}>
                  <h2 className={styles.cardTitle}>Store Policies &amp; Terms</h2>
                  <p className={styles.cardSubtitle}>Transparency, handcrafted standards, and fresh fulfillment guarantee.</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link href="/policies/shipping" className={styles.btnSecondary}>
                  Shipping &amp; Delivery Policy
                </Link>
                <Link href="/policies/refund" className={styles.btnSecondary}>
                  Return &amp; Refund Policy
                </Link>
                <Link href="/policies/privacy" className={styles.btnSecondary}>
                  Privacy Policy
                </Link>
                <Link href="/policies/terms" className={styles.btnSecondary}>
                  Terms of Service
                </Link>
              </div>
            </section>
          </main>
        )}

        {/* ── TAB 4: Customer Care & Support ── */}
        {activeTab === "messages" && (
          <main className={styles.panel}>
            <section className={styles.contentCard}>
              <div className={styles.contentCardHeader}>
                <div className={styles.cardHeadingGroup}>
                  <h2 className={styles.cardTitle}>Customer Care &amp; Inquiries</h2>
                  <p className={styles.cardSubtitle}>
                    Direct messages with our kitchen and fulfillment team regarding orders, bulk packaging, or customization.
                  </p>
                </div>
                <Link href="/contact" className={styles.btnPrimary}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Send New Message</span>
                </Link>
              </div>

              {!messagesLoaded ? (
                <p style={{ fontSize: 14, color: "#a8a29e", margin: 0 }}>Loading your inquiries…</p>
              ) : userMessages.length === 0 ? (
                <div className={styles.emptyState}>
                  <svg className={styles.emptyStateIcon} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <h3 className={styles.emptyStateTitle}>No messages sent yet</h3>
                  <p className={styles.emptyStateText}>
                    Need assistance with an existing order or want to inquire about custom corporate gifting? Our support team is here to assist.
                  </p>
                  <Link href="/contact" className={styles.btnPrimary}>
                    Contact Customer Care
                  </Link>
                </div>
              ) : (
                <div className={styles.messagesStream}>
                  {userMessages.map((msg) => {
                    const subjectLabels: Record<string, string> = {
                      order: "Order Inquiry",
                      product: "Product Question",
                      bulk: "Bulk Orders",
                      feedback: "Feedback",
                      other: "General Inquiry",
                    };

                    return (
                      <div key={msg.id} className={styles.messageThreadCard}>
                        <div className={styles.messageThreadHeader}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span className={styles.subjectBadge}>
                              {subjectLabels[msg.subject] ?? msg.subject}
                            </span>
                            {msg.adminReply ? (
                              <span className={styles.reviewedBadge}>Replied by Store Team</span>
                            ) : (
                              <span style={{ fontSize: 11.5, color: "#78716c", fontFamily: "var(--font-dm-mono, monospace)" }}>
                                ⏳ Awaiting Kitchen Reply
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 12, color: "#a8a29e" }}>
                            {new Date(msg.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        <div className={styles.userMessageBubble}>{msg.message}</div>

                        {msg.adminReply && (
                          <div className={styles.storeReplyBubble}>
                            <div className={styles.storeReplyHeader}>
                              <span>✦ Raghul Delights Care Team</span>
                              {msg.replyAt && (
                                <span style={{ fontWeight: 400, color: "#166534" }}>
                                  · {new Date(msg.replyAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </div>
                            <p className={styles.storeReplyText}>{msg.adminReply}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick WhatsApp Support Banner */}
            <div className={styles.whatsappBanner}>
              <div className={styles.whatsappBannerText}>
                <strong className={styles.whatsappTitle}>
                  Need instant updates or live order assistance?
                </strong>
                <span className={styles.whatsappDesc}>
                  Chat directly with our kitchen and customer care on WhatsApp for immediate support.
                </span>
              </div>
              <a
                href="https://wa.me/918667829041?text=Hello%20Raghul%20Delights%2C%20I%20have%20an%20inquiry%20regarding%20my%20account"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.whatsappLinkBtn}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.99.54 1.848.813 2.796.814h.005c3.179 0 5.767-2.587 5.768-5.766.001-3.18-2.585-5.767-5.769-5.767zm7.643 5.767c0 4.215-3.428 7.644-7.644 7.644-1.258 0-2.457-.312-3.528-.863l-4.502 1.181 1.203-4.394c-.663-1.121-1.018-2.404-1.018-3.568 0-4.215 3.428-7.644 7.645-7.644 4.216 0 7.644 3.429 7.644 7.644z" />
                </svg>
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

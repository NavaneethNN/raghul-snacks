"use client";

import { useState, useEffect } from "react";
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
    name: string;
    quantity: number;
    price: string;
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
      stock: number;
      featured: boolean;
      bestseller: boolean;
    } | null;
  }>;
};

type AccountDashboardProps = {
  account: {
    name: string;
    email: string;
    createdAt: Date;
  };
  orders: Order[];
};

export function AccountDashboard({ account, orders }: AccountDashboardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [name, setName] = useState(account.name);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

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
        // Clear the local cart so it doesn't persist to the next user on this browser
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

  async function downloadInvoice(orderNumber: string) {
    try {
      const response = await fetch(`/api/orders/${orderNumber}/invoice`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download invoice");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert(error instanceof Error ? error.message : "Failed to download invoice. Please try again.");
    }
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

  function handleBuyAgain(order: Order) {
    if (!order.items || order.items.length === 0) {
      alert("No items in this order");
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    order.items.forEach((item) => {
      if (item.product) {
        const catalogProduct = {
          id: String(item.product.id),
          slug: item.product.slug,
          name: item.product.name,
          category: "snacks",
          price: Number(item.product.price),
          offerPrice: Number(item.product.offerPrice || item.product.price),
          weight: item.product.weight,
          description: item.product.description,
          ingredients: item.product.ingredients || "",
          badge: item.product.bestseller ? "Bestseller" : undefined,
          image: item.product.image,
        };
        addItem(catalogProduct, item.quantity);
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

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <h1>My Account</h1>
          <p>Manage your profile and view your order history</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Account Details Card */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Account Details</h2>
            {!confirmSignOut ? (
              <button
                onClick={() => setConfirmSignOut(true)}
                className={styles.signOutButton}
                disabled={signingOut}
              >
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            ) : (
              <div className={styles.signOutConfirm}>
                <span>Sign out?</span>
                <button onClick={handleSignOut} className={styles.signOutConfirmYes} disabled={signingOut}>
                  Yes
                </button>
                <button onClick={() => setConfirmSignOut(false)} className={styles.signOutConfirmNo}>
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className={styles.accountInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Name</span>
              {editingName ? (
                <div className={styles.nameEdit}>
                  <input
                    className={styles.nameInput}
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
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
                      <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                </span>
              )}
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Email</span>
              <strong>{account.email}</strong>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Member Since</span>
              <strong>
                {new Date(account.createdAt).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </div>
          </div>
        </section>

        {/* Orders */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Your Orders</h2>
            <Link href="/track" className={styles.textLink}>
              Track Order
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
              <h3>No orders yet</h3>
              <p>Start shopping to see your orders here</p>
              <Link href="/shop" className={styles.button}>
                Browse Products
              </Link>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {/* Order detail modal */}
              {detailOrder && (
                <OrderDetailModal
                  order={detailOrder}
                  onClose={() => setDetailOrder(null)}
                  onDownloadInvoice={downloadInvoice}
                  onBuyAgain={handleBuyAgain}
                />
              )}

              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  {/* ── Clickable header row — opens detail modal ── */}
                  <button
                    type="button"
                    className={styles.orderToggle}
                    onClick={() => setDetailOrder(order)}
                    aria-label={`View details for ${order.orderNumber}`}
                  >
                    {/* Top row: order number + date */}
                    <div className={styles.orderMeta}>
                      <strong className={styles.orderNumber}>{order.orderNumber}</strong>
                      <p className={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Bottom row: amount + badges + arrow */}
                    <div className={styles.orderSummaryRow}>
                      <strong className={styles.orderTotal}>
                        {price.format(parseFloat(order.total))}
                      </strong>
                      <div className={styles.badges}>
                        <span className={`${styles.badge} ${styles[order.orderStatus]}`}>
                          {order.orderStatus}
                        </span>
                        <span className={`${styles.badge} ${order.paymentStatus === "paid" ? styles.paid : styles.pending}`}>
                          {order.paymentStatus}
                        </span>
                      </div>
                      <svg
                        className={styles.chevron}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

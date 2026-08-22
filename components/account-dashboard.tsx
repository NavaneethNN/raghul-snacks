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
  const [showOrders, setShowOrders] = useState(false);

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

      {/* Order detail modal */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onDownloadInvoice={downloadInvoice}
          onBuyAgain={handleBuyAgain}
        />
      )}

      <div className={styles.content}>
        {/* ── Account Details Card ── */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Account Details</h2>
            {!confirmSignOut ? (
              <button onClick={() => setConfirmSignOut(true)} className={styles.signOutButton} disabled={signingOut}>
                {signingOut ? "Signing out…" : "Sign Out"}
              </button>
            ) : (
              <div className={styles.signOutConfirm}>
                <span>Sign out?</span>
                <button onClick={handleSignOut} className={styles.signOutConfirmYes} disabled={signingOut}>Yes</button>
                <button onClick={() => setConfirmSignOut(false)} className={styles.signOutConfirmNo}>Cancel</button>
              </div>
            )}
          </div>
          <div className={styles.accountInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Name</span>
              {editingName ? (
                <div className={styles.nameEdit}>
                  <input className={styles.nameInput} value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus maxLength={100} disabled={savingName} />
                  <button type="button" className={styles.nameSaveButton} onClick={saveName} disabled={savingName}>{savingName ? "Saving…" : "Save"}</button>
                  <button type="button" className={styles.nameCancelButton} onClick={cancelEditingName} disabled={savingName}>Cancel</button>
                  {nameError && <p className={styles.nameError}>{nameError}</p>}
                </div>
              ) : (
                <span className={styles.nameDisplay}>
                  <strong>{name}</strong>
                  <button type="button" className={styles.editIconButton} onClick={startEditingName} aria-label="Edit name">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
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
              <strong>{new Date(account.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
            </div>
          </div>

          {/* My Orders button */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={() => setShowOrders((p) => !p)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: showOrders ? "var(--ink)" : "var(--cream)",
                color: showOrders ? "#fff" : "var(--ink)",
                border: "1.5px solid var(--line)",
                borderRadius: 10, padding: "12px 20px",
                font: "600 14px 'DM Sans', sans-serif",
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { if (!showOrders) { e.currentTarget.style.borderColor = "var(--terracotta)"; e.currentTarget.style.color = "var(--terracotta)"; } }}
              onMouseLeave={(e) => { if (!showOrders) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; } }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              My Orders
              {orders.length > 0 && (
                <span style={{ background: "var(--terracotta)", color: "#fff", borderRadius: 20, padding: "1px 8px", fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>
                  {orders.length}
                </span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform 0.2s", transform: showOrders ? "rotate(180deg)" : "none" }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>
        </section>

        {/* ── Orders list ── */}
        {showOrders && (
          <section className={styles.card} style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, font: "700 20px 'Playfair Display', serif", color: "var(--ink)" }}>
                Your Orders
              </h2>
              <Link href="/track" className={styles.textLink}>Track order</Link>
            </div>

            {orders.length === 0 ? (
              <div className={styles.emptyState}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                <h3>No orders yet</h3>
                <p>Start shopping to see your orders here</p>
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
                    {/* Order header row */}
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
                            placed:    { background: "#fef3c7", color: "#92400e" },
                            packed:    { background: "#dbeafe", color: "#1e40af" },
                            shipped:   { background: "#dcfce7", color: "#166534" },
                            delivered: { background: "#d1fae5", color: "#065f46" },
                            cancelled: { background: "#fee2e2", color: "#991b1b" },
                          } as Record<string, React.CSSProperties>)[order.orderStatus] ?? { background: "#f3f4f6", color: "#374151" }
                        }}>
                          {order.orderStatus}
                        </span>
                        <strong style={{ fontSize: 15, fontFamily: "'DM Sans',sans-serif", color: "var(--ink)" }}>
                          {price.format(parseFloat(order.total))}
                        </strong>
                      </div>
                    </div>

                    {/* Product chips — click to open order detail modal */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                      {order.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDetailOrder(order)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            background: "var(--cream)", border: "1px solid var(--line)",
                            borderRadius: 8, padding: "8px 12px", cursor: "pointer",
                            textAlign: "left", transition: "border-color 0.15s, box-shadow 0.15s",
                            maxWidth: 260,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--terracotta)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(201,95,59,0.1)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          {item.product?.image ? (
                            <img
                              src={item.product.image}
                              alt={item.name}
                              style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)", flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, background: "var(--line)", borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                              {item.name}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280", fontFamily: "'DM Mono',monospace" }}>
                              Qty {item.quantity} · {price.format(parseFloat(item.price) * item.quantity)}
                            </p>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <path d="M9 18l6-6-6-6"/>
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

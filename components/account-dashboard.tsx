"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import styles from "./account-dashboard.module.css";

type Order = {
  id: number;
  orderNumber: string;
  total: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: Date;
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
      createdAt: Date;
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

  const price = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  async function handleSignOut() {
    if (!confirm("Are you sure you want to sign out?")) return;

    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/session", {
        method: "DELETE",
      });

      if (response.ok) {
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

  function handleBuyAgain(order: Order) {
    if (!order.items || order.items.length === 0) {
      alert("No items in this order");
      return;
    }

    let addedCount = 0;
    order.items.forEach((item) => {
      if (item.product) {
        // Transform database product to catalog Product type
        const catalogProduct = {
          id: String(item.product.id),
          slug: item.product.slug,
          name: item.product.name,
          category: "snacks", // Default category since it's not in database
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
      }
    });

    if (addedCount > 0) {
      alert(`${addedCount} item(s) added to cart`);
      router.push("/cart");
    } else {
      alert("Unable to add items to cart. Some products may no longer be available.");
    }
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
            <button
              onClick={handleSignOut}
              className={styles.signOutButton}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
          <div className={styles.accountInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Name</span>
              <strong>{account.name}</strong>
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
              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <div>
                      <strong className={styles.orderNumber}>
                        {order.orderNumber}
                      </strong>
                      <p className={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className={styles.orderHeaderRight}>
                      <strong className={styles.orderTotal}>
                        {price.format(parseFloat(order.total))}
                      </strong>
                      <div className={styles.badges}>
                        <span
                          className={`${styles.badge} ${
                            styles[order.orderStatus]
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                        <span
                          className={`${styles.badge} ${
                            order.paymentStatus === "paid"
                              ? styles.paid
                              : styles.pending
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div className={styles.orderItems}>
                      {order.items.map((item) => (
                        <div key={item.id} className={styles.orderItem}>
                          <span className={styles.itemName}>{item.name}</span>
                          <span className={styles.itemDetails}>
                            × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.orderActions}>
                    <button
                      onClick={() => handleBuyAgain(order)}
                      className={styles.buyAgainButton}
                    >
                      Buy Again
                    </button>
                    <button
                      onClick={() => downloadInvoice(order.orderNumber)}
                      className={styles.downloadInvoiceButton}
                    >
                      Download Invoice
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

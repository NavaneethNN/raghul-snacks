"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    name: string;
    quantity: number;
    price: string;
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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

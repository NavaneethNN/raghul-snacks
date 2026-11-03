"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/catalog";
import styles from "./bottom-cart-bar.module.css";

const STORAGE_KEY = "raghul-hide-bottom-cart";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function BottomCartBar() {
  const isClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const pathname = usePathname();
  const { count, subtotal, isCartOpen, openCart, items } = useCart();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [prevCount, setPrevCount] = useState(count);

  // If user adds new items after dismissing, reveal the bar again to confirm addition
  if (count > prevCount) {
    setPrevCount(count);
    if (dismissed) {
      setDismissed(false);
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  } else if (count !== prevCount) {
    setPrevCount(count);
  }

  // Don't render if SSR, cart is empty, or dismissed
  if (!isClient || count <= 0 || items.length === 0 || dismissed) {
    return null;
  }

  // Never show on cart, checkout, admin, or when drawer is already open
  if (
    isCartOpen ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname?.startsWith("/admin")
  ) {
    return null;
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  }

  return (
    <aside className={styles.barContainer} aria-label="Cart summary bar">
      <div
        className={styles.barPill}
        onClick={openCart}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openCart();
          }
        }}
        aria-label={`View shopping bag with ${count} item${count > 1 ? "s" : ""} totaling ${formatPrice(subtotal)}`}
      >
        <div className={styles.leftInfo}>
          <div className={styles.cartIconWrap}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className={styles.cartBadge}>{count}</span>
          </div>

          <div className={styles.metaText}>
            <span className={styles.metaCountPrice}>
              <span>{count} {count === 1 ? "item" : "items"}</span>
              <span>·</span>
              <span className={styles.metaPrice}>{formatPrice(subtotal)}</span>
            </span>
            <span className={styles.metaSubtext}>Tap to review bag</span>
          </div>
        </div>

        <div className={styles.rightActions}>
          <button
            type="button"
            className={styles.viewCartBtn}
            onClick={(e) => {
              e.stopPropagation();
              openCart();
            }}
          >
            <span>View Bag</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          <button
            type="button"
            className={styles.dismissBtn}
            onClick={handleDismiss}
            title="Dismiss for this session"
            aria-label="Dismiss cart bar"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

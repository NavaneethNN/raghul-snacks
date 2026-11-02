"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { clearBuyNowItem } from "@/lib/buy-now";
import styles from "./cart-drawer.module.css";

export function CartDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { items, count, subtotal, isCartOpen, closeCart, updateQuantity, removeItem } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen && pathname !== "/checkout") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen, pathname]);

  if (pathname === "/checkout") return null;

  const handleCheckout = () => {
    clearBuyNowItem();
    closeCart();
    router.push("/checkout");
  };

  const handleViewCart = () => {
    closeCart();
    router.push("/cart");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.overlay} ${isCartOpen ? styles.overlayOpen : ""}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={drawerRef}
        className={`${styles.drawer} ${isCartOpen ? styles.drawerOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <h2 className={styles.title}>Your Bag</h2>
            {count > 0 && <span className={styles.countBadge}>{count} {count === 1 ? "item" : "items"}</span>}
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={closeCart}
            aria-label="Close bag"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Small Trust Banner */}
        <div className={styles.trustBanner}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span>Small-batch homemade taste • Freshly packed for you</span>
        </div>

        {/* Items or Empty State */}
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3 className={styles.emptyTitle}>Your bag is empty</h3>
            <p className={styles.emptyText}>
              Discover authentic South Indian snacks, roasted seedai, crunchy murukku, and millet laddus!
            </p>
            <Link href="/shop" className={styles.emptyShopBtn} onClick={closeCart}>
              Browse All Snacks →
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.itemsList}>
              {items.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.thumbWrap}>
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <span className={styles.placeholderThumb}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                          <line x1="12" y1="22.08" x2="12" y2="12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className={styles.itemDetails}>
                    <div>
                      <Link
                        href={item.slug ? `/product/${item.slug}` : "/shop"}
                        className={styles.itemName}
                        onClick={closeCart}
                      >
                        {item.name}
                      </Link>
                      <div className={styles.itemMeta}>
                        {formatWeight(item.weight)}
                      </div>
                    </div>

                    <div className={styles.priceAndQty}>
                      <span className={styles.itemPrice}>
                        {formatPrice(item.offerPrice * item.quantity)}
                      </span>
                      <div className={styles.qtyControls}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className={styles.qtyValue}>{item.quantity}</span>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove item"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.subtotalRow}>
                <span className={styles.subtotalLabel}>Subtotal</span>
                <span className={styles.subtotalAmount}>{formatPrice(subtotal)}</span>
              </div>
              <p className={styles.shippingNote}>
                Shipping calculated at checkout. Delivery across India.
              </p>

              <button
                type="button"
                className={styles.checkoutBtn}
                onClick={handleCheckout}
              >
                Proceed to Checkout →
              </button>

              <button
                type="button"
                className={styles.viewCartBtn}
                onClick={handleViewCart}
              >
                View Full Bag ({count})
              </button>

              <div className={styles.securityNote}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>100% Secure Checkout powered by Razorpay</span>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}


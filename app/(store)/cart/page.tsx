"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { AddToCart } from "@/components/product/add-to-cart";
import { clearBuyNowItem } from "@/lib/buy-now";
import { useRouter } from "next/navigation";

type CartItem = ReturnType<typeof useCart>["items"][number];

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const router = useRouter();
  const { addItem: addToWishlist, isInWishlist } = useWishlist();
  const [upsellProduct, setUpsellProduct] = useState<any>(null);
  // the item pending removal — null means sheet is closed
  const [pendingItem, setPendingItem] = useState<CartItem | null>(null);

  // Close sheet on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setPendingItem(null); }
    if (pendingItem) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingItem]);

  // Lock body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = pendingItem ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [pendingItem]);

  useEffect(() => {
    async function fetchUpsellProduct() {
      try {
        const response = await fetch("/api/products");
        if (!response.ok) return;
        const products = await response.json();
        const cartIds = items.map(item => String(item.id));
        const availableProducts = products.filter((p: any) => !cartIds.includes(String(p.id)));
        if (availableProducts.length > 0) {
          const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
          setUpsellProduct({
            ...randomProduct,
            id: String(randomProduct.id),
            price: parseFloat(randomProduct.price),
            offerPrice: randomProduct.offerPrice ? parseFloat(randomProduct.offerPrice) : parseFloat(randomProduct.price),
          });
        }
      } catch (error) {
        console.error("Error fetching upsell product:", error);
      }
    }
    if (items.length > 0) fetchUpsellProduct();
  }, [items]);

  function handleMoveToWishlist(item: CartItem) {
    addToWishlist({
      id: item.id,
      name: item.name,
      slug: item.slug ?? "",
      price: item.price,
      offerPrice: item.offerPrice,
      weight: item.weight,
      image: item.image ?? null,
    });
    removeItem(item.id);
    setPendingItem(null);
  }

  function handleDelete(id: string) {
    removeItem(id);
    setPendingItem(null);
  }

  if (!items.length) {
    return (
      <section className="empty-state">
        <p className="eyebrow">Your bag is waiting</p>
        <h1>Nothing here yet.</h1>
        <p>Explore our pantry and find a new favourite.</p>
        <Link className="button button-dark" href="/shop">Shop snacks</Link>
      </section>
    );
  }

  return (
    <>
      <section className="cart-page">
        <div>
          <p className="eyebrow">Your selection</p>
          <h1>Your bag ({items.length})</h1>
          <div className="cart-items">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-thumb">
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : (
                    <span className="cart-placeholder">✦</span>
                  )}
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p>{formatWeight(item.weight)}</p>
                  <strong>{formatPrice(item.offerPrice)}</strong>
                </div>
                <div className="quantity">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <button
                  className="remove"
                  onClick={() => setPendingItem(item)}
                  aria-label={`Remove ${item.name}`}
                  title="Remove item"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
        </div>

        <aside className="order-summary">
          <h2>Order summary</h2>

          {/* Item breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6b7280" }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                  {item.name} <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11 }}>×{item.quantity}</span>
                </span>
                <span style={{ flexShrink: 0, fontWeight: 600, color: "var(--ink)" }}>{formatPrice(item.offerPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ display: "flex", justifyContent: "space-between", margin: 0, fontSize: 14 }}>
              <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""})</span>
              <strong>{formatPrice(subtotal)}</strong>
            </p>
            <p style={{ display: "flex", justifyContent: "space-between", margin: 0, fontSize: 13, color: "#6b7280" }}>
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </p>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
            <strong style={{ fontSize: 18, fontFamily: "'DM Sans',sans-serif" }}>{formatPrice(subtotal)}</strong>
          </div>
          <button
            onClick={() => { clearBuyNowItem(); router.push("/checkout"); }}
            className="button button-dark wide-button"
          >
            Secure checkout →
          </button>
          <small>Safe payments powered by Cashfree</small>

          {upsellProduct && (
            <div className="cart-upsell">
              <p className="eyebrow">A perfect add-on</p>
              <h3>{upsellProduct.name}</h3>
              <p>{upsellProduct.description}</p>
              <AddToCart product={upsellProduct} />
            </div>
          )}
        </aside>
      </section>

      {/* ── Remove item bottom sheet ── */}
      {pendingItem && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setPendingItem(null); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(36,49,39,0.5)",
            zIndex: 10002,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            backdropFilter: "blur(2px)",
          }}
        >
          <div style={{
            background: "var(--paper)",
            width: "100%",
            maxWidth: 480,
            borderRadius: "16px 16px 0 0",
            padding: "24px 20px 32px",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.14)",
            animation: "cartSheetUp 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}>
            <style>{`@keyframes cartSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

            {/* drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--line)", margin: "0 auto 20px" }} />

            {/* item preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 14px", background: "var(--cream)", border: "1px solid var(--line)", borderRadius: 10 }}>
              {pendingItem.image && (
                <img src={pendingItem.image} alt={pendingItem.name} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
              )}
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{pendingItem.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{formatWeight(pendingItem.weight)} · Qty {pendingItem.quantity}</p>
              </div>
            </div>

            <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>What would you like to do?</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!isInWishlist(pendingItem.id) && (
                <button
                  onClick={() => handleMoveToWishlist(pendingItem)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    background: "var(--cream)", border: "1.5px solid var(--line)",
                    borderRadius: 10, padding: "13px 16px", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, color: "var(--ink)", width: "100%",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--terracotta)", flexShrink: 0 }}>
                    <path d="M10 17.5C10 17.5 2 13 2 7.5C2 4.74 4 3 6 3C7.5 3 9 4 10 5C11 4 12.5 3 14 3C16 3 18 4.74 18 7.5C18 13 10 17.5 10 17.5Z" />
                  </svg>
                  Move to Wishlist
                </button>
              )}
              <button
                onClick={() => handleDelete(pendingItem.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  background: "#fff0f0", border: "1.5px solid #fecaca",
                  borderRadius: 10, padding: "13px 16px", cursor: "pointer",
                  fontSize: 14, fontWeight: 600, color: "#dc2626", width: "100%",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete from Cart
              </button>
              <button
                onClick={() => setPendingItem(null)}
                style={{
                  background: "none", border: "none", fontSize: 13,
                  color: "#9ca3af", cursor: "pointer", padding: "8px 0",
                  fontFamily: "inherit",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

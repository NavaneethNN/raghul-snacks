"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/toast-provider";
import { setBuyNowItem } from "@/lib/buy-now";

export function ComboActions({ combo }: { combo: any }) {
  const router = useRouter();
  const { addItem, getItemQuantity } = useCart();
  const { show } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const offerPrice = combo.discount && parseFloat(combo.discount) > 0
    ? parseFloat(combo.discount)
    : parseFloat(combo.price);
  const originalPrice = parseFloat(combo.price);
  const hasDiscount = offerPrice < originalPrice;
  const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  const cartComboId = `combo-${combo.id}`;
  const cartCombo = {
    id: cartComboId,
    slug: combo.slug,
    name: combo.title,
    price: originalPrice,
    offerPrice,
    weight: `${combo.items?.length || 0} items`,
    description: combo.description || `Combo with ${combo.items?.length || 0} products`,
    ingredients: combo.items?.map((item: any) => item.name).join(", ") || "",
    category: "combo",
    image: combo.image || "",
  };

  const inCart = getItemQuantity(cartComboId) > 0;

  function handleAddToCart() {
    if (added) return;
    addItem(cartCombo, quantity);
    setAdded(true);
    // Show "Go to Cart" toast with a link-style message for 5 seconds
    show("✓ Added to cart", { duration: 5000, href: "/cart" });
    window.setTimeout(() => setAdded(false), 3000);
  }

  function handleBuyNow() {
    if (redirecting) return;
    setRedirecting(true);
    setBuyNowItem(cartCombo, quantity);
    router.push("/checkout");
  }

  return (
    <>
      <div className="product-purchase-row">
        {/* Quantity selector */}
        <div className="quantity-selector-compact">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span>{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to Cart */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`button wide-button ${added ? "button-success" : inCart ? "button-dark" : "button-dark"}`}
          disabled={added}
          style={added ? { cursor: "default" } : undefined}
        >
          {added ? "✓ Added to Cart" : inCart ? "+ Add More" : "Add Combo to Cart"}
        </button>

        {/* Buy Now */}
        <button
          type="button"
          onClick={handleBuyNow}
          className="button buy-now-button wide-button"
          disabled={redirecting}
        >
          {redirecting ? "Redirecting…" : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span>Buy Combo</span>
              <span style={{ opacity: 0.85, fontSize: "13px" }}>({fmt.format(offerPrice * quantity)})</span>
            </span>
          )}
        </button>
      </div>

      {/* Trust Strip */}
      <div className="product-trust-strip">
        <div className="trust-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>100% Pure Natural</span>
        </div>
        <div className="trust-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Small-Batch Daily</span>
        </div>
        <div className="trust-pill">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
          <span>Pan-India Safe Pack</span>
        </div>
      </div>
    </>
  );
}

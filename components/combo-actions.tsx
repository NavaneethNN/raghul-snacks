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
    <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
      {/* Quantity selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          border: "1.5px solid var(--line)",
          borderRadius: "8px",
          padding: "4px",
        }}
      >
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          style={{
            width: "36px",
            height: "36px",
            border: "none",
            background: "var(--cream)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "18px",
            fontWeight: "bold",
            color: "var(--ink)",
          }}
        >
          −
        </button>
        <span style={{ minWidth: "40px", textAlign: "center", fontWeight: "600", fontSize: "16px" }}>
          {quantity}
        </span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          style={{
            width: "36px",
            height: "36px",
            border: "none",
            background: "var(--cream)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "18px",
            fontWeight: "bold",
            color: "var(--ink)",
          }}
        >
          +
        </button>
      </div>

      {/* Add to Cart */}
      <button
        onClick={handleAddToCart}
        className="button"
        disabled={added}
        style={{
          flex: "1",
          minWidth: "160px",
          background: added ? "#16a34a" : inCart ? "var(--terracotta)" : "var(--ink)",
          color: "white",
          border: added ? "2px solid #16a34a" : inCart ? "2px solid var(--terracotta)" : "2px solid var(--ink)",
          opacity: 1,
          cursor: added ? "default" : "pointer",
        }}
      >
        {added ? "✓ Added to Cart" : inCart ? "+ Add More" : "Add to Cart"}
      </button>

      {/* Buy Now */}
      <button
        onClick={handleBuyNow}
        className="button buy-now-button"
        disabled={redirecting}
        style={{ flex: "1", minWidth: "160px" }}
      >
        {redirecting ? "Redirecting…" : (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.3 }}>
            <span>Get this combo · {fmt.format(offerPrice)}</span>
            {hasDiscount && (
              <span style={{ fontSize: "11px", opacity: 0.8 }}>
                <s>{fmt.format(originalPrice)}</s>
                {" · Save "}{fmt.format(originalPrice - offerPrice)}
              </span>
            )}
          </span>
        )}
      </button>
    </div>
  );
}

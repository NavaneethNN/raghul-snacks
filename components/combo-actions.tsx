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

  const cartCombo = {
    id: String(combo.id),
    slug: combo.slug,
    name: combo.title,
    price: parseFloat(combo.price),
    offerPrice:
      combo.discount && parseFloat(combo.discount) > 0
        ? parseFloat(combo.discount)
        : parseFloat(combo.price),
    weight: `${combo.items?.length || 0} items`,
    description: combo.description || `Combo with ${combo.items?.length || 0} products`,
    ingredients: combo.items?.map((item: any) => item.name).join(", ") || "",
    category: "combo",
    image: combo.image || "",
  };

  const inCart = getItemQuantity(combo.id) > 0;

  function handleAddToCart() {
    if (inCart || added) return;
    addItem(cartCombo, quantity);
    setAdded(true);
    // Show "Go to Cart" toast with a link-style message for 5 seconds
    show("✓ Added to cart", { duration: 5000, href: "/cart" });
    window.setTimeout(() => setAdded(false), 5000);
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
        disabled={inCart || added}
        style={{
          flex: "1",
          minWidth: "160px",
          background: inCart || added ? "#16a34a" : "var(--ink)",
          color: "white",
          border: inCart || added ? "2px solid #16a34a" : "2px solid var(--ink)",
          opacity: 1,
          cursor: inCart || added ? "default" : "pointer",
        }}
      >
        {inCart || added ? "✓ Added to Cart" : "Add to Cart"}
      </button>

      {/* Buy Now */}
      <button
        onClick={handleBuyNow}
        className="button buy-now-button"
        disabled={redirecting}
        style={{ flex: "1", minWidth: "160px" }}
      >
        {redirecting ? "Redirecting…" : "Buy Now"}
      </button>
    </div>
  );
}

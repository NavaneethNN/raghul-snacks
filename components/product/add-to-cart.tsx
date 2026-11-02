"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/toast-provider";

export function AddToCart({ product, quantity = 1, className = "", showModal = false }: { product: Product; quantity?: number; className?: string; showModal?: boolean }) {
  const { addItem, getItemQuantity } = useCart();
  const { show } = useToast();
  const [justAdded, setJustAdded] = useState(false);

  const inCart = getItemQuantity(product.id) > 0;

  function handleClick() {
    if (justAdded) return;
    addItem(product, quantity);
    show(`${product.name} added to cart`);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2200);
  }

  return (
    <button
      className={`button button-dark ${className}`}
      onClick={handleClick}
      disabled={justAdded}
      style={justAdded ? { opacity: 1, cursor: "default" } : undefined}
    >
      {justAdded ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Added
        </span>
      ) : inCart ? "+ Add More" : "Add to Cart"}
    </button>
  );
}

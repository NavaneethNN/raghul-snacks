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
  const isAdded = inCart || justAdded;

  function handleClick() {
    if (isAdded) return;
    addItem(product, quantity);
    show(`✓ ${product.name} added to cart`);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2200);
  }

  return (
    <button
      className={`button button-dark ${className}`}
      onClick={handleClick}
      disabled={isAdded}
      style={isAdded ? { opacity: 1, cursor: "default", pointerEvents: "none" } : undefined}
    >
      {isAdded ? "✓ Added" : "Add to Cart"}
    </button>
  );
}

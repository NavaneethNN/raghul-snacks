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
    show(`✓ ${product.name} added to cart`);
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
      {justAdded ? "✓ Added" : inCart ? "+ Add More" : "Add to Cart"}
    </button>
  );
}

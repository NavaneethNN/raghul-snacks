"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";

export function AddToCart({ product, quantity = 1, className = "", showModal = false }: { product: Product; quantity?: number; className?: string; showModal?: boolean }) {
  const { addItem, getItemQuantity } = useCart();
  const [added, setAdded] = useState(false);

  const inCart = getItemQuantity(product.id) > 0;

  function handleClick() {
    if (inCart || added) return;
    addItem(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      className={`button ${inCart || added ? 'button-success' : 'button-dark'} ${className}`}
      onClick={handleClick}
      disabled={inCart || added}
    >
      {inCart || added ? "✓ Added to Cart" : "Add to Cart"}
    </button>
  );
}

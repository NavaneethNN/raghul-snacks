"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";

export function AddToCart({ product, quantity = 1, className = "" }: { product: Product; quantity?: number; className?: string }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function add() {
    addItem(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return <button className={`button button-dark ${className}`} onClick={add}>{added ? "Added to cart ✓" : "Add to cart"}</button>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/catalog";
import { setBuyNowItem } from "@/lib/buy-now";

export function BuyNow({ product, quantity = 1, className = "" }: { product: Product; quantity?: number; className?: string }) {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  function handleClick() {
    if (redirecting) return;
    setRedirecting(true);
    // Stash just this product (without touching the persistent cart) and
    // send the shopper straight to checkout with only this item.
    setBuyNowItem(product, quantity);
    router.push("/checkout");
  }

  return (
    <button
      type="button"
      className={`button buy-now-button ${className}`}
      onClick={handleClick}
      disabled={redirecting}
    >
      {redirecting ? "Redirecting…" : "Buy Now"}
    </button>
  );
}

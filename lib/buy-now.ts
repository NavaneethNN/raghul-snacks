import type { Product } from "@/lib/catalog";

export type BuyNowItem = Product & { quantity: number };

const STORAGE_KEY = "raghul-snacks-buy-now";

export function setBuyNowItem(product: Product, quantity = 1) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...product, quantity }));
}

export function readBuyNowItem(): BuyNowItem | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BuyNowItem) : null;
  } catch {
    return null;
  }
}

export function clearBuyNowItem() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

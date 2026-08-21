"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/catalog";

type CartItem = Product & { quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getItemQuantity: (id: string | number) => number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage once on mount
  useEffect(() => {
    const saved = window.localStorage.getItem("raghul-snacks-cart");
    if (saved) {
      try {
        setItems(JSON.parse(saved) as CartItem[]);
      } catch {
        // corrupted data — start fresh
      }
    }
    setHydrated(true);
  }, []);

  // Write to localStorage only after hydration to avoid overwriting saved data
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("raghul-snacks-cart", JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo(() => ({
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.offerPrice * item.quantity, 0),
    addItem: (product: Product, quantity = 1) => setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { ...product, quantity }];
    }),
    updateQuantity: (id: string, quantity: number) => setItems((current) => quantity < 1 ? current.filter((item) => item.id !== id) : current.map((item) => item.id === id ? { ...item, quantity } : item)),
    removeItem: (id: string) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: () => setItems([]),
    getItemQuantity: (id: string | number) => {
      const item = items.find((item) => item.id === id || item.id === String(id));
      return item ? item.quantity : 0;
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

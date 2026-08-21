"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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

// ── Server cart helpers ───────────────────────────────────────────────────────

type ServerCartItem = {
  productId: string;
  quantity: number;
  product: {
    id: number; name: string; slug: string; description: string;
    ingredients: string | null; price: string; offerPrice: string | null;
    weight: string; categoryId: number | null; image: string | null;
    stock: number; featured: boolean; bestseller: boolean;
  } | null;
};

async function fetchServerCart(): Promise<CartItem[]> {
  try {
    const res = await fetch("/api/cart", { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json() as { items: ServerCartItem[] };
    return data.items
      .filter((row) => row.product !== null)
      .map((row) => {
        const p = row.product!;
        return {
          id: row.productId,
          name: p.name,
          slug: p.slug,
          description: p.description,
          ingredients: p.ingredients ?? "",
          price: parseFloat(p.price),
          offerPrice: p.offerPrice ? parseFloat(p.offerPrice) : parseFloat(p.price),
          weight: p.weight,
          category: "",
          image: p.image ?? "",
          featured: p.featured,
          bestseller: p.bestseller,
          quantity: row.quantity,
        } as CartItem;
      });
  } catch {
    return [];
  }
}

async function pushServerCart(items: CartItem[]) {
  if (!items.length) return;
  try {
    await fetch("/api/cart", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ productId: i.id, quantity: i.quantity })) }),
    });
  } catch { /* best-effort */ }
}

async function removeServerItem(productId: string) {
  try {
    await fetch("/api/cart", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  } catch { /* best-effort */ }
}

async function clearServerCart() {
  try {
    await fetch("/api/cart", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch { /* best-effort */ }
}

async function isLoggedIn(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json() as { account?: unknown };
    return !!data.account;
  } catch {
    return false;
  }
}

// Merge server cart into local: add missing items, keep local quantity for conflicts
function mergeCarts(local: CartItem[], server: CartItem[]): CartItem[] {
  const result = [...local];
  for (const serverItem of server) {
    const exists = result.find((i) => i.id === serverItem.id);
    if (!exists) result.push(serverItem);
    // local quantity wins when item exists in both
  }
  return result;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  // Prevent push-back during the initial server merge
  const mergingRef = useRef(false);
  // Debounce timer for syncing local changes to server
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 1: Load localStorage, check session, merge with server ───────────
  useEffect(() => {
    async function init() {
      // Load local storage
      let local: CartItem[] = [];
      try {
        const saved = window.localStorage.getItem("raghul-snacks-cart");
        if (saved) local = JSON.parse(saved) as CartItem[];
      } catch { /* corrupted — start fresh */ }

      const loggedInNow = await isLoggedIn();
      setLoggedIn(loggedInNow);

      if (loggedInNow) {
        mergingRef.current = true;
        const server = await fetchServerCart();

        // Only carry over local items if they were added as a guest (no account stamp).
        // If localStorage belonged to a different account, discard it.
        const savedAccount = window.localStorage.getItem("raghul-snacks-cart-account");
        const sessionRes = await fetch("/api/auth/session", { credentials: "include" });
        const sessionData = await sessionRes.json() as { account?: { email: string } };
        const currentEmail = sessionData.account?.email ?? "";

        const localIsGuest = !savedAccount;
        const localBelongsToThisAccount = savedAccount === currentEmail;

        let merged: CartItem[];
        if (localIsGuest) {
          // Guest had items — merge them with server cart (server wins for existing items)
          merged = mergeCarts(server, local);
        } else if (localBelongsToThisAccount) {
          // Same account — merge normally, local quantity wins
          merged = mergeCarts(local, server);
        } else {
          // Different account's cart in localStorage — use server cart only
          merged = server;
        }

        // Stamp localStorage with current account
        window.localStorage.setItem("raghul-snacks-cart-account", currentEmail);
        setItems(merged);
        // Push merged state back to server
        await pushServerCart(merged);
        mergingRef.current = false;
      } else {
        // Not logged in — clear account stamp so next login treats this as guest cart
        window.localStorage.removeItem("raghul-snacks-cart-account");
        setItems(local);
      }

      setHydrated(true);
    }
    init();
  }, []);

  // ── Step 2: Persist to localStorage after hydration ───────────────────────
  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("raghul-snacks-cart", JSON.stringify(items));
  }, [items, hydrated]);

  // ── Step 3: Debounce-sync full cart state to server on every change ────────
  const scheduleSync = useCallback((nextItems: CartItem[]) => {
    if (!loggedIn || mergingRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      pushServerCart(nextItems);
    }, 600);
  }, [loggedIn]);

  // ── Cart mutations ────────────────────────────────────────────────────────
  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((t, i) => t + i.quantity, 0),
    subtotal: items.reduce((t, i) => t + i.offerPrice * i.quantity, 0),

    addItem: (product: Product, quantity = 1) => {
      setItems((current) => {
        const existing = current.find((i) => i.id === product.id);
        const next = existing
          ? current.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
          : [...current, { ...product, quantity }];
        scheduleSync(next);
        return next;
      });
    },

    updateQuantity: (id: string, quantity: number) => {
      setItems((current) => {
        const next = quantity < 1
          ? current.filter((i) => i.id !== id)
          : current.map((i) => i.id === id ? { ...i, quantity } : i);
        if (quantity < 1 && loggedIn) removeServerItem(id);
        else scheduleSync(next);
        return next;
      });
    },

    removeItem: (id: string) => {
      setItems((current) => {
        const next = current.filter((i) => i.id !== id);
        if (loggedIn) removeServerItem(id);
        return next;
      });
    },

    clearCart: () => {
      setItems([]);
      if (loggedIn) clearServerCart();
    },

    getItemQuantity: (id: string | number) => {
      const item = items.find((i) => i.id === id || i.id === String(id));
      return item ? item.quantity : 0;
    },
  }), [items, loggedIn, scheduleSync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

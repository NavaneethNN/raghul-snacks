"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";

type CartItem = Product & { quantity: number };
type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  syncing: boolean;
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

// Merge server cart into local: server item data wins (fresh names/prices), but local quantity wins
// For logged-in users: server is authoritative — only items in server cart are valid.
// Local items are added ONLY if they don't exist on server (new guest additions not yet synced).
function mergeCarts(local: CartItem[], server: CartItem[]): CartItem[] {
  const result: CartItem[] = [];
  // Start with server items (fresh data from DB, already filtered for deleted products)
  for (const serverItem of server) {
    const localItem = local.find((i) => i.id === serverItem.id);
    if (localItem) {
      // Use server data (fresh name/price/image) but keep local quantity
      result.push({ ...serverItem, quantity: localItem.quantity });
    } else {
      result.push(serverItem);
    }
  }
  // Add local-only items ONLY if they look like recently-added guest items
  // (i.e. not items that were on server but got deleted — those won't be in server)
  // We skip local items whose base product ID isn't in the server cart at all,
  // UNLESS this is a fresh guest merge (handled by caller passing server as first arg)
  return result;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(true); // start true — stays true until full init completes
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

      // Show local cart immediately — no waiting for network
      setItems(local);
      setHydrated(true);

      // Check login status in background
      const loggedInNow = await isLoggedIn();
      setLoggedIn(loggedInNow);

      if (loggedInNow) {
        // Fetch server cart in background and merge
        mergingRef.current = true;
        setSyncing(true);
        const [server, sessionRes] = await Promise.all([
          fetchServerCart(),
          fetch("/api/auth/session", { credentials: "include" }),
        ]);
        const sessionData = await sessionRes.json() as { account?: { email: string } };
        const currentEmail = sessionData.account?.email ?? "";

        const savedAccount = window.localStorage.getItem("raghul-snacks-cart-account");
        const localIsGuest = !savedAccount;
        const localBelongsToThisAccount = savedAccount === currentEmail;

        let merged: CartItem[];
        if (localIsGuest) {
          merged = [...server];
          for (const localItem of local) {
            const onServer = server.find((s) => s.id === localItem.id);
            if (!onServer) merged.push(localItem);
          }
        } else if (localBelongsToThisAccount) {
          // Server is authoritative for item validity (no deleted products)
          // but local items not yet synced to server should be kept
          merged = mergeCarts(local, server);
          // Add any local items that aren't on the server yet (not synced)
          for (const localItem of local) {
            const onServer = server.find((s) => s.id === localItem.id);
            const alreadyInMerged = merged.find((m) => m.id === localItem.id);
            if (!onServer && !alreadyInMerged) merged.push(localItem);
          }
        } else {
          merged = server;
        }

        window.localStorage.setItem("raghul-snacks-cart-account", currentEmail);
        setItems(merged);
        await pushServerCart(merged);
        mergingRef.current = false;
        setSyncing(false);
        return; // hydrated already set above
      } else {
        // Not logged in — clear account stamp so next login treats this as guest cart
        window.localStorage.removeItem("raghul-snacks-cart-account");
        // Show cart immediately from localStorage, then validate in background
        setItems(local);
        setHydrated(true);
        setSyncing(false);
        // Background validation — remove deleted products without blocking render
        if (local.length > 0) {
          const ids = [...new Set(local.map((i) => i.id.toString().split("-v")[0]))];
          fetch(`/api/products?ids=${ids.join(",")}`)
            .then((res) => res.ok ? res.json() : null)
            .then((validProducts: Array<{ id: number }> | null) => {
              if (!validProducts) return;
              const validIds = new Set(validProducts.map((p) => String(p.id)));
              setItems((current) => current.filter((item) => {
                const baseId = item.id.toString().split("-v")[0];
                return validIds.has(baseId);
              }));
            })
            .catch(() => { /* best-effort */ });
        }
        return; // already set hydrated above
      }
      // guest path — hydrated and syncing already set above
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
    hydrated,
    syncing,

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

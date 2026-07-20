"use client";

import { createContext, useContext, useEffect, useState } from "react";

type WishlistItem = {
  id: string | number;
  name: string;
  slug: string;
  price: number;
  offerPrice: number;
  weight: string;
  image: string | null;
};

type WishlistContextValue = {
  items: WishlistItem[];
  count: number;
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string | number) => void;
  isInWishlist: (id: string | number) => boolean;
  clearWishlist: () => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("raghul-snacks-wishlist");
    if (saved) {
      try {
        setItems(JSON.parse(saved) as WishlistItem[]);
      } catch (error) {
        console.error("Failed to parse wishlist:", error);
        setItems([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("raghul-snacks-wishlist", JSON.stringify(items));
  }, [items]);

  const addItem = (item: WishlistItem) => {
    setItems((current) => {
      const exists = current.find((i) => String(i.id) === String(item.id));
      if (exists) return current;
      return [...current, item];
    });
  };

  const removeItem = (id: string | number) => {
    setItems((current) => current.filter((item) => String(item.id) !== String(id)));
  };

  const isInWishlist = (id: string | number) => {
    return items.some((item) => String(item.id) === String(id));
  };

  const clearWishlist = () => {
    setItems([]);
  };

  const value: WishlistContextValue = {
    items,
    count: items.length,
    addItem,
    removeItem,
    isInWishlist,
    clearWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}

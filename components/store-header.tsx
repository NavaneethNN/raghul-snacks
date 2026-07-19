"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";

export function StoreHeader() {
  const { count } = useCart();
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/auth/session").then(async (response) => {
      const data = await response.json() as { account?: { name: string; email: string } | null };
      setAccount(data.account || null);
    }).catch(() => setAccount(null));
  }, []);

  return (
    <header className="site-header">
      <div className="header-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <Link className="brand" href="/">
            <span>Raghul</span> Snacks
          </Link>
          <p className="brand-tagline">Homemade • Fresh • Traditional</p>
        </div>

        <nav className="header-nav">
          <Link href="/shop">Shop</Link>
          <div className="nav-dropdown">
            <Link href="/shop">Categories</Link>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <Link href="/about">Our Story</Link>
          <Link href="#">Reviews</Link>
          <Link href="#">Contact</Link>
        </nav>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search snacks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="header-actions">
          <Link href="#" className="action-icon" title="Wishlist">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 17.5C10 17.5 2 13 2 7.5C2 4.74 4 3 6 3C7.5 3 9 4 10 5C11 4 12.5 3 14 3C16 3 18 4.74 18 7.5C18 13 10 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span>Wishlist</span>
          </Link>

          <Link href={account ? "/orders" : "/login"} className="action-icon" title="Account">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 17C2 14 5.5 12 10 12C14.5 12 18 14 18 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Account</span>
          </Link>

          <Link href="/cart" className="action-icon cart-icon" title={`Cart${count > 0 ? ` (${count} items)` : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 3H4L5.5 12.5H16L17 6H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="16" r="1" fill="currentColor" />
              <circle cx="14" cy="16" r="1" fill="currentColor" />
            </svg>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}

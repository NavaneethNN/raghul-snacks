"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function StoreHeader() {
  const { count } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/auth/session").then(async (response) => {
      const data = await response.json() as { account?: { name: string; email: string } | null };
      setAccount(data.account || null);
    }).catch(() => setAccount(null));

    fetch("/api/categories").then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    }).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          <div
            className="nav-dropdown"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button
              onClick={() => scrollToSection('categories')}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Categories
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none" style={{ transition: 'transform 0.2s', transform: categoriesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {categoriesOpen && (
              <div className="dropdown-menu">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/shop/${category.slug}`}
                    className="dropdown-item"
                  >
                    <span>{category.name}</span>
                    <small>{category.description || 'Explore our collection'}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => scrollToSection('bestsellers')}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0 }}
          >
            Bestsellers
          </button>
          <Link href="/about">Our Story</Link>
          <Link href="/contact">Contact</Link>
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
          <Link href="/wishlist" className="action-icon" title={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 17.5C10 17.5 2 13 2 7.5C2 4.74 4 3 6 3C7.5 3 9 4 10 5C11 4 12.5 3 14 3C16 3 18 4.74 18 7.5C18 13 10 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            {wishlistCount > 0 && <span className="cart-badge">{wishlistCount}</span>}
          </Link>

          <Link href={account ? "/account" : "/login"} className="action-icon" title="Account">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 17C2 14 5.5 12 10 12C14.5 12 18 14 18 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Account</span>
          </Link>

          <Link href="/cart" className="action-icon cart-icon" title={`Bag${count > 0 ? ` (${count} items)` : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 6H16V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7 6V5C7 3.34315 8.34315 2 10 2C11.6569 2 13 3.34315 13 5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </Link>

          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={menuOpen ? "open" : ""}></span>
            <span className={menuOpen ? "open" : ""}></span>
            <span className={menuOpen ? "open" : ""}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
            <span>Raghul</span> Snacks
          </Link>
          
        </div>

        <nav className="mobile-nav">
          <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop All</Link>
          <button
            onClick={() => {
              scrollToSection('categories');
              setMenuOpen(false);
            }}
            className="mobile-nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0, textAlign: 'left', width: '100%' }}
          >
            Categories
          </button>
          <button
            onClick={() => {
              scrollToSection('bestsellers');
              setMenuOpen(false);
            }}
            className="mobile-nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0, textAlign: 'left', width: '100%' }}
          >
            Bestsellers
          </button>
          <Link href="/about" onClick={() => setMenuOpen(false)}>Our Story</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          <Link href="/wishlist" onClick={() => setMenuOpen(false)}>
            Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
          </Link>
          <Link href={account ? "/account" : "/login"} onClick={() => setMenuOpen(false)}>
            {account ? "My Account" : "Login"}
          </Link>
        </nav>

        <div className="mobile-menu-footer">
          <p>Homemade • Fresh • Traditional</p>
        </div>
      </div>
    </header>
  );
}

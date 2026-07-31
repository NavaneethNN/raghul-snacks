"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  const [categoriesTimeout, setCategoriesTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

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
    document.body.classList.toggle('mobile-menu-open', menuOpen);
    document.body.style.overflow = menuOpen ? 'hidden' : '';

    return () => {
      document.body.classList.remove('mobile-menu-open');
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (sectionId: string) => {
    // Close mobile menu first
    setMenuOpen(false);
    
    // If not on home page, navigate to home with hash
    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    // If on home page, scroll to section with a small delay to ensure menu is closed
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80; // Account for fixed header height
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
  };

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 2) {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data || []);
          setSearchOpen(true);
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
      setSearchOpen(false);
    }
  };

  const handleResultClick = (product: any) => {
    setSearchOpen(false);
    setSearchQuery("");
    window.location.href = `/product/${product.slug}`;
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <img src="/logo.png" alt="Raghul Delights" style={{ height: "70px", width: "auto", mixBlendMode: "multiply", margin: "-10px 0", padding: 0, maxHeight: "50px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <Link className="brand" href="/">
          <span>Raghul</span> Delights

            
          </Link>
          <p className="brand-tagline">Homemade • Fresh • Traditional</p>
        </div>

        <nav className="header-nav">
          <Link href="/shop">Shop</Link>
          <div
            className="nav-dropdown"
            onMouseEnter={() => {
              if (categoriesTimeout) {
                clearTimeout(categoriesTimeout);
                setCategoriesTimeout(null);
              }
              setCategoriesOpen(true);
            }}
            onMouseLeave={() => {
              const timeout = setTimeout(() => {
                setCategoriesOpen(false);
              }, 200);
              setCategoriesTimeout(timeout);
            }}
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
              <div 
                className="dropdown-menu"
                onMouseEnter={() => {
                  if (categoriesTimeout) {
                    clearTimeout(categoriesTimeout);
                    setCategoriesTimeout(null);
                  }
                  setCategoriesOpen(true);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => {
                    setCategoriesOpen(false);
                  }, 200);
                  setCategoriesTimeout(timeout);
                }}
              >
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/shop/${category.slug}`}
                    className="dropdown-item"
                  >
                    <span>{category.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/about">Our Story</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <form className="search-bar" onSubmit={handleSearch} style={{ position: "relative" }} ref={searchRef}>
          <input
            type="text"
            placeholder="Search snacks..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
          />
          <button type="submit" className="search-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11.5 11.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {searchOpen && searchResults.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              marginTop: "4px",
              maxHeight: "300px",
              overflowY: "auto",
              zIndex: 100,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}>
              {searchResults.map((product: any) => (
                <div
                  key={product.id}
                  onClick={() => handleResultClick(product)}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                >
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "14px", color: "#374151" }}>{product.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>₹{product.offerPrice || product.price}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="header-actions">
          <Link href="/wishlist" className="action-icon" title="Wishlist">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 17.5C10 17.5 2 13 2 7.5C2 4.74 4 3 6 3C7.5 3 9 4 10 5C11 4 12.5 3 14 3C16 3 18 4.74 18 7.5C18 13 10 17.5 10 17.5Z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
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
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src="/logo.png" alt="Raghul Delights" style={{ height: "55px", width: "auto", mixBlendMode: "multiply" }} />
            <span style={{ fontSize: "18px", fontWeight: 600 }}>Raghul Delights</span>
          </Link>
          <button type="button" className="close-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mobile-nav">
          <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop All</Link>
          <button
            onClick={() => scrollToSection('categories')}
            className="mobile-nav-link"
          >
            Categories
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

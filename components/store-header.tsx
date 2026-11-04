"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { getClientSession, invalidateClientSession } from "@/lib/client-session";

// Module-level cache so session + categories are fetched once per browser
// session, not on every client-side navigation.
let cachedCategories: any[] | undefined = undefined;

export function StoreHeader() {
  const router = useRouter();
  const { count, subtotal, openCart } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>(cachedCategories ?? []);
  const [categoriesTimeout, setCategoriesTimeout] = useState<NodeJS.Timeout | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenBagFromMenu = () => {
    setMenuOpen(false);
    setTimeout(() => {
      openCart();
    }, 120);
  };

  useEffect(() => {
    // Shared deduplicated session check
    getClientSession().then((d) => {
      setAccount((d.account as any) || null);
    });

    if (cachedCategories === undefined) {
      fetch("/api/categories")
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            cachedCategories = data;
            setCategories(data);
          }
        })
        .catch(() => {
          cachedCategories = [];
          setCategories([]);
        });
    }
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
    setMenuOpen(false);
    
    if (window.location.pathname !== '/') {
      // Use Next.js router for client-side navigation instead of hard reload
      router.push(`/#${sectionId}`);
      return;
    }
    
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }, 100);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      setSearchOpen(false);
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (value.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(async () => {
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
      }, 300);
    } else {
      setSearchResults([]);
      setSearchOpen(false);
    }
  };

  const handleResultClick = (product: any) => {
    setSearchOpen(false);
    setSearchQuery("");
    // Use Next.js router for client-side navigation (avoids full page reload)
    router.push(`/product/${product.slug}`);
  };

  // Expose a way to invalidate the session cache (called on sign-in/sign-out)
  // so the header reflects the new auth state on the next render cycle.
  useEffect(() => {
    const invalidate = () => {
      invalidateClientSession();
      getClientSession(true).then((d) => {
        setAccount((d.account as any) || null);
      });
    };
    window.addEventListener("session-changed", invalidate);
    return () => window.removeEventListener("session-changed", invalidate);
  }, []);

  return (
    <header className="site-header">
      <div className="header-container">
        <Link className="logo" href="/" >
            <img src="/logo.png" alt="Raghul Delights" style={{ height: "48px", width: "auto", mixBlendMode: "multiply", margin: 0, padding: 0 }} />
        </Link>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <Link className="brand" href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
          <Link href="/wishlist" className="action-icon cart-icon" title={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ''}`}>
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

          <button
            type="button"
            onClick={openCart}
            className="action-icon cart-icon"
            title={`Bag${count > 0 ? ` (${count} items)` : ''}`}
            aria-label={`Shopping bag with ${count} items`}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 6H16V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M7 6V5C7 3.34315 8.34315 2 10 2C11.6569 2 13 3.34315 13 5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {count > 0 && <span className="cart-badge">{count}</span>}
          </button>

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

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="mobile-menu-header">
          <Link
            className="brand"
            href="/"
            onClick={() => setMenuOpen(false)}
          >
            <img src="/logo.png" alt="Raghul Delights" />
            <div className="mobile-menu-header-text">
              <span className="mobile-menu-brand-name">Raghul Delights</span>
              <span className="mobile-menu-brand-tag">Homemade • Fresh</span>
            </div>
          </Link>
          <button
            type="button"
            className="close-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="mobile-menu-scrollable">
          {/* User Account Tile */}
          <Link
            href={account ? "/account" : "/login"}
            className="mobile-account-card"
            onClick={() => setMenuOpen(false)}
          >
            <div className="mobile-account-info-group">
              {account ? (
                <div className="mobile-account-avatar">
                  {account.name ? account.name.charAt(0).toUpperCase() : "U"}
                </div>
              ) : (
                <div className="mobile-account-avatar-guest">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}
              <div className="mobile-account-text">
                <div className="mobile-account-name">
                  {account ? account.name : "Welcome, Guest"}
                </div>
                <div className="mobile-account-sub">
                  {account ? "Manage profile & orders" : "Sign in for saved address & orders"}
                </div>
              </div>
            </div>
            <div className="mobile-account-login-btn">
              {account ? "My Account →" : "Sign In →"}
            </div>
          </Link>

          {/* ── Featured "Your Bag" Section ── */}
          <div
            className="mobile-bag-card"
            onClick={handleOpenBagFromMenu}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenBagFromMenu();
              }
            }}
          >
            <div className="mobile-bag-card-top">
              <div className="mobile-bag-left">
                <div className="mobile-bag-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {count > 0 && <span className="mobile-bag-count-badge">{count}</span>}
                </div>
                <div className="mobile-bag-details">
                  <div className="mobile-bag-headline">Your Bag</div>
                  <div className="mobile-bag-meta">
                    {count > 0 ? (
                      <>
                        <span className="mobile-bag-meta-count">{count} {count === 1 ? "item" : "items"}</span>
                        <span className="mobile-bag-meta-sep">•</span>
                        <span className="mobile-bag-meta-total">₹{Math.round(subtotal)}</span>
                      </>
                    ) : (
                      <span>0 items • Bag is empty</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mobile-bag-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenBagFromMenu();
                }}
              >
                {count > 0 ? "View Bag →" : "Shop Now"}
              </button>
            </div>
            {count > 0 && (
              <div className="mobile-bag-card-bottom">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Freshly crafted in small batches • Ready to pack</span>
              </div>
            )}
          </div>

          {/* ── Search Bar with Quick Chips & Live Results ── */}
          <div className="mobile-search-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  setMenuOpen(false);
                  router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              className="mobile-search-form"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search crunchy snacks, laddus, podis..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="mobile-search-input"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  className="mobile-search-clear-btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </form>

            {/* Live Search Suggestions Dropdown */}
            {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
              <div className="mobile-search-results">
                {searchResults.slice(0, 4).map((p: any) => (
                  <div
                    key={p.id}
                    className="mobile-search-result-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setSearchQuery("");
                      router.push(`/product/${p.slug}`);
                    }}
                  >
                    {p.image && (
                      <img src={p.image} alt={p.name} className="mobile-search-result-img" />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mobile-search-result-name">{p.name}</div>
                      <div className="mobile-search-result-price">₹{p.offerPrice || p.price}</div>
                    </div>
                    <span style={{ color: "#9ca3af", fontSize: "14px" }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Navigation Links ── */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Explore Store</div>

            {/* Shop All */}
            <Link
              href="/shop"
              className="mobile-nav-link-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <span>Shop All Snacks</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            {/* Categories Accordion */}
            <div>
              <button
                type="button"
                className={`mobile-nav-link-row ${mobileCategoriesOpen ? "active" : ""}`}
                onClick={() => setMobileCategoriesOpen(!mobileCategoriesOpen)}
                aria-expanded={mobileCategoriesOpen}
              >
                <div className="mobile-nav-left">
                  <div className="mobile-nav-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="3" width="7" height="7" rx="1.5" />
                      <rect x="14" y="14" width="7" height="7" rx="1.5" />
                      <rect x="3" y="14" width="7" height="7" rx="1.5" />
                    </svg>
                  </div>
                  <span>Browse Categories</span>
                </div>
                <div className="mobile-nav-right">
                  <span className="mobile-nav-badge">{categories.length}</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{
                      transition: "transform 0.25s ease",
                      transform: mobileCategoriesOpen ? "rotate(180deg)" : "rotate(0deg)",
                      color: "#9ca3af",
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {mobileCategoriesOpen && (
                <div className="mobile-categories-accordion">
                  {categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/shop/${cat.slug}`}
                      className="mobile-category-subitem"
                      onClick={() => setMenuOpen(false)}
                    >
                      <span>{cat.name}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: "#9ca3af" }}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="mobile-category-subitem"
                    onClick={() => scrollToSection('categories')}
                    style={{ background: "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer", color: "var(--terracotta)", fontWeight: 600 }}
                  >
                    <span>View Category Showcase →</span>
                  </button>
                </div>
              )}
            </div>

            {/* Special Combos */}
            <Link
              href="/shop?tab=combos"
              className="mobile-nav-link-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12" />
                    <rect x="2" y="7" width="20" height="5" />
                    <line x1="12" y1="22" x2="12" y2="7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                </div>
                <span>Special Combos</span>
              </div>
              <div className="mobile-nav-right">
                <span className="mobile-nav-tag-green">Value Boxes</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>

            {/* Bestsellers */}
            <button
              type="button"
              className="mobile-nav-link-row"
              onClick={() => scrollToSection('bestsellers')}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <span>Loved Bestsellers</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* ── Services Section ── */}
          <div className="mobile-nav-section">
            <div className="mobile-nav-section-title">Customer Care</div>

            {/* Track Order */}
            <Link
              href="/track"
              className="mobile-nav-link-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <span>Track Your Order</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="mobile-nav-link-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <span>My Wishlist</span>
              </div>
              <div className="mobile-nav-right">
                {wishlistCount > 0 && <span className="mobile-nav-badge">{wishlistCount}</span>}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>

            {/* Our Story */}
            <Link
              href="/about"
              className="mobile-nav-link-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9a9 9 0 0 1-9-9 9 9 0 0 1 9-9z" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <span>Our Story</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            {/* Contact */}
            <Link
              href="/contact"
              className="mobile-nav-link-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-left">
                <div className="mobile-nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <span>Contact Us</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mobile-nav-chevron">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>

          {/* ── WhatsApp Direct Support Banner ── */}
          <a
            href="https://wa.me/918667829041?text=Hi%20Raghul%20Delights%2C%20I%20would%20like%20to%20know%20more%20about%20your%20snacks"
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-whatsapp-card"
            onClick={() => setMenuOpen(false)}
          >
            <div className="mobile-whatsapp-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mobile-whatsapp-title">Need Help Ordering?</div>
              <div className="mobile-whatsapp-sub">Chat directly with us on WhatsApp</div>
            </div>
            <span style={{ color: "#16a34a", fontSize: "16px", fontWeight: "700" }}>→</span>
          </a>
        </div>

        {/* Footer with Trust & Social Links */}
        <div className="mobile-menu-footer">
          <div className="mobile-menu-trust-row">
            <span className="mobile-menu-trust-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              100% Veg
            </span>
            <span className="mobile-menu-trust-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Fresh Batch
            </span>
            <span className="mobile-menu-trust-chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Pan-India
            </span>
          </div>

          <div className="mobile-menu-social-row">
            <a href="https://wa.me/918667829041" target="_blank" rel="noopener noreferrer" className="mobile-menu-social-link" aria-label="WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/raghul_delights?igsh=emg3b3plYmkxeWlo" target="_blank" rel="noopener noreferrer" className="mobile-menu-social-link" aria-label="Instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href="https://www.facebook.com/share/1Be8hDcm56/" target="_blank" rel="noopener noreferrer" className="mobile-menu-social-link" aria-label="Facebook">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="11" />
                <path d="M13.5 8H15V5.5H13.2C10.9 5.5 9.5 6.9 9.5 9.2V11H7.5V13.5H9.5V19H12.5V13.5H14.5L15 11H12.5V9.5C12.5 8.5 12.8 8 13.5 8Z" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

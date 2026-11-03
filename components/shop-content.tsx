"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import styles from "./shop-content.module.css";

type Category = {
  id: number;
  name: string;
  slug: string;
};

type Product = any;
type Combo = any;

type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

export function ShopContent({
  categories,
  products,
  combos,
  searchQuery = ""
}: {
  categories: Category[];
  products: Product[];
  combos: Combo[];
  searchQuery?: string;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const categoryParam = searchParams.get("category");

  // User input states
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [userTab, setUserTab] = useState<string | null>(categoryParam || null);
  const [sortBy, setSortBy] = useState<SortOption>("featured");

  const selectedTab = userTab ?? tabParam ?? "products";
  const activeTab = selectedTab === "combos" && combos.length === 0 ? "products" : selectedTab;

  // Modern horizontal slider refs and scroll state
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const updateScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    updateScrollState();

    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState();
      });
      resizeObserver.observe(el);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateScrollState, categories.length, combos.length]);

  // Keep active tab centered in view smoothly on mount or tab change
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeEl = tabsRef.current.querySelector<HTMLElement>(`.${styles.tabBtnActive}`);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTab]);

  const slide = (direction: "left" | "right") => {
    const el = tabsRef.current;
    if (!el) return;
    const distance = Math.max(el.clientWidth * 0.65, 260);
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const handleTabClick = (tab: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDraggedRef.current) return;
    setActiveTab(tab);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tabsRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragScrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !tabsRef.current) return;
    const x = e.pageX - tabsRef.current.offsetLeft;
    const distance = x - dragStartXRef.current;
    if (Math.abs(distance) > 5) {
      hasDraggedRef.current = true;
      tabsRef.current.scrollLeft = dragScrollLeftRef.current - distance;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  function setActiveTab(tab: string) {
    setUserTab(tab);
  }

  function handleResetFilters() {
    setUserTab("products");
    setSearchTerm("");
    setSortBy("featured");
  }

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    return products.filter((product: any) => {
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase().trim();
      return (
        product.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.categoryName?.toLowerCase().includes(query) ||
        product.categorySlug?.toLowerCase().includes(query) ||
        product.ingredients?.toLowerCase().includes(query)
      );
    });
  }, [products, searchTerm]);

  // Filter combos based on search query
  const filteredCombos = useMemo(() => {
    return combos.filter((combo: any) => {
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase().trim();
      return (
        combo.title?.toLowerCase().includes(query) ||
        combo.description?.toLowerCase().includes(query) ||
        combo.items?.some((item: any) => item.name?.toLowerCase().includes(query))
      );
    });
  }, [combos, searchTerm]);

  // Helper to get effective price of product
  function getEffectivePrice(p: any): number {
    if (p.variants && p.variants.length > 0) {
      const v = p.variants[0];
      return parseFloat(v.offerPrice || v.price) || 0;
    }
    return parseFloat(p.offerPrice || p.price) || 0;
  }

  // Sort function
  const sortComparator = useMemo(() => {
    return (a: any, b: any) => {
      if (sortBy === "price-asc") {
        return getEffectivePrice(a) - getEffectivePrice(b);
      }
      if (sortBy === "price-desc") {
        return getEffectivePrice(b) - getEffectivePrice(a);
      }
      if (sortBy === "name-asc") {
        const nameA = (a.name || a.title || "").toLowerCase();
        const nameB = (b.name || b.title || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0; // featured maintains original server ordering
    };
  }, [sortBy]);

  // Tab-filtered & sorted lists
  const displayedProducts = useMemo(() => {
    let list = filteredProducts;
    if (activeTab !== "products" && activeTab !== "combos") {
      list = list.filter((p: any) => p.categorySlug === activeTab);
    }
    if (sortBy !== "featured") {
      list = [...list].sort(sortComparator);
    }
    return list;
  }, [filteredProducts, activeTab, sortBy, sortComparator]);

  const displayedCombos = useMemo(() => {
    if (activeTab !== "combos") return [];
    let list = filteredCombos;
    if (sortBy !== "featured") {
      list = [...list].sort((a: any, b: any) => {
        const priceA = parseFloat(a.discount && parseFloat(a.discount) > 0 ? a.discount : a.price) || 0;
        const priceB = parseFloat(b.discount && parseFloat(b.discount) > 0 ? b.discount : b.price) || 0;
        if (sortBy === "price-asc") return priceA - priceB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "name-asc") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
    }
    return list;
  }, [filteredCombos, activeTab, sortBy]);

  const totalCount = activeTab === "combos" ? displayedCombos.length : displayedProducts.length;

  return (
    <>
      <div className={styles.controlsBar}>
        {/* Search & Sort Row */}
        <div className={styles.searchAndSortRow}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search snacks, ingredients, laddus…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search snacks in shop"
            />
            {searchTerm && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchTerm("")}
                aria-label="Clear search input"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className={styles.sortWrapper}>
            <span className={styles.sortLabel}>Sort by:</span>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort snacks by"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Categories Tabs Row (Modern Horizontal Slider) */}
        <div className={styles.sliderWrapper}>
          {canScrollLeft && (
            <div className={styles.navBtnWrapperLeft}>
              <button
                type="button"
                className={styles.sliderNavBtn}
                onClick={() => slide("left")}
                aria-label="Scroll categories left"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            </div>
          )}

          <div
            ref={tabsRef}
            className={styles.tabsScroll}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            role="tablist"
            aria-label="Snack categories slider"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "products"}
              className={`${styles.tabBtn} ${activeTab === "products" ? styles.tabBtnActive : ""}`}
              onClick={(e) => handleTabClick("products", e)}
            >
              <span>All Snacks</span>
              <span className={styles.tabCount}>{filteredProducts.length}</span>
            </button>

            {combos.length > 0 && (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "combos"}
                className={`${styles.tabBtn} ${activeTab === "combos" ? styles.tabBtnActive : ""}`}
                onClick={(e) => handleTabClick("combos", e)}
              >
                <span>Combos</span>
                <span className={styles.tabCount}>{filteredCombos.length}</span>
              </button>
            )}

            {categories.map((category) => {
              const catCount = products.filter((p: any) => p.categorySlug === category.slug).length;
              return (
                <button
                  type="button"
                  role="tab"
                  key={category.slug}
                  aria-selected={activeTab === category.slug}
                  className={`${styles.tabBtn} ${activeTab === category.slug ? styles.tabBtnActive : ""}`}
                  onClick={(e) => handleTabClick(category.slug, e)}
                >
                  <span>{category.name}</span>
                  <span className={styles.tabCount}>{catCount}</span>
                </button>
              );
            })}
          </div>

          {canScrollRight && (
            <div className={styles.navBtnWrapperRight}>
              <button
                type="button"
                className={styles.sliderNavBtn}
                onClick={() => slide("right")}
                aria-label="Scroll categories right"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary Bar */}
      <div className={styles.resultsSummary}>
        <div>
          Showing <strong>{totalCount}</strong> {totalCount === 1 ? "delight" : "delights"}
        </div>
        {(searchTerm || activeTab !== "products" || sortBy !== "featured") && (
          <div className={styles.activeFilters}>
            {searchTerm && (
              <span className={styles.filterBadge}>
                &ldquo;{searchTerm}&rdquo;
                <button type="button" onClick={() => setSearchTerm("")} aria-label="Remove search filter">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            )}
            {activeTab !== "products" && (
              <span className={styles.filterBadge}>
                {activeTab === "combos" ? "Combos" : categories.find(c => c.slug === activeTab)?.name || activeTab}
                <button type="button" onClick={() => setActiveTab("products")} aria-label="Clear category filter">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            )}
            <button type="button" className={styles.resetAllBtn} onClick={handleResetFilters}>
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Product Grid */}
      <div className="product-grid">
        {activeTab !== "combos" && displayedProducts.length === 0 && (
          <div className={styles.emptyStateBox}>
            <h3 className={styles.emptyStateTitle}>No snacks found</h3>
            <p className={styles.emptyStateDesc}>
              {searchTerm ? `We couldn't find any snacks matching "${searchTerm}".` : "No products available in this selection."}
            </p>
            <button type="button" className={styles.emptyActionBtn} onClick={handleResetFilters}>
              View All Snacks
            </button>
          </div>
        )}

        {activeTab !== "combos" &&
          displayedProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))
        }

        {activeTab === "combos" && displayedCombos.length === 0 && (
          <div className={styles.emptyStateBox}>
            <h3 className={styles.emptyStateTitle}>No combos found</h3>
            <p className={styles.emptyStateDesc}>
              {searchTerm ? `We couldn't find any combos matching "${searchTerm}".` : "No combo boxes currently available."}
            </p>
            <button type="button" className={styles.emptyActionBtn} onClick={handleResetFilters}>
              View All Snacks
            </button>
          </div>
        )}

        {activeTab === "combos" &&
          displayedCombos.map((combo: any) => (
            <article key={combo.id} className="product-card">
              <Link href={`/combo/${combo.slug}`} className="product-visual">
                {combo.image ? (
                  <img src={combo.image} alt={combo.title} loading="lazy" />
                ) : (
                  <div className="product-visual-placeholder">
                    <span className="placeholder-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    </span>
                  </div>
                )}
                <span className="category-label">Combo</span>
              </Link>
              <div className="product-copy">
                <p>{combo.items?.length || 0} items</p>
                <Link href={`/combo/${combo.slug}`}>
                  <h3>{combo.title}</h3>
                </Link>
                <div className="price">
                  <strong>₹{combo.discount && parseFloat(combo.discount) > 0 ? combo.discount : combo.price}</strong>
                  {combo.discount && parseFloat(combo.discount) > 0 && (
                    <s>₹{combo.price}</s>
                  )}
                </div>
                <Link href={`/combo/${combo.slug}`} className="button">
                  View Combo
                </Link>
              </div>
            </article>
          ))
        }
      </div>
    </>
  );
}

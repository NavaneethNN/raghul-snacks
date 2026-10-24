"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/toast-provider";
import { setBuyNowItem } from "@/lib/buy-now";
import { useRouter } from "next/navigation";
import { WishlistButton } from "@/components/wishlist-button";

type Variant = {
  id: number;
  productId: number;
  weight: string;
  price: string;
  offerPrice: string | null;
  sortOrder: number;
  active: boolean;
};

export function ProductDetailView({ product, variants = [] }: { product: any; variants?: Variant[] }) {
  const router = useRouter();
  const { addItem, getItemQuantity } = useCart();
  const { show } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // If variants exist, default to the first one
  const hasVariants = variants.length > 0;
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(hasVariants ? variants[0] : null);

  // Prices come from selected variant when available, otherwise fall back to product
  const basePrice = selectedVariant
    ? parseFloat(selectedVariant.price)
    : parseFloat(product.price) || 0;
  const displayPrice = selectedVariant
    ? (selectedVariant.offerPrice ? parseFloat(selectedVariant.offerPrice) : basePrice)
    : (product.offerPrice ? parseFloat(product.offerPrice) : basePrice);
  const displayWeight = selectedVariant ? selectedVariant.weight : product.weight;

  // Cart item ID is unique per product+variant to allow multiple variants in cart
  const cartItemId = selectedVariant
    ? `${product.id}-v${selectedVariant.id}`
    : String(product.id);

  const cartProduct = {
    ...product,
    id: cartItemId,
    slug: product.slug || "",
    name: product.name || "",
    price: basePrice,
    offerPrice: displayPrice,
    weight: displayWeight,
    description: product.description || "",
    ingredients: product.ingredients || "",
    category: product.categorySlug || product.category || "",
    image: product.image || "",
  };

  const cartQuantity = getItemQuantity(cartItemId);
  const inCart = cartQuantity > 0;
  const isAdded = added;
  const hasDiscount = displayPrice < basePrice;
  const isOutOfStock = product.active === false || (typeof product.stock === "number" && product.stock <= 0);

  const categoryName =
    product.categoryName ||
    product.categorySlug?.replace("-", " ") ||
    product.category?.replace("-", " ") ||
    "";

  function handleVariantSelect(variant: Variant) {
    setSelectedVariant(variant);
    setAdded(false); // reset added state when switching variant
  }

  function handleAddToCart() {
    if (added) return;
    addItem(cartProduct, quantity);
    show(`✓ ${product.name} (${formatWeight(displayWeight)}) added to cart`);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  function handleBuyNow() {
    if (redirecting) return;
    setRedirecting(true);
    setBuyNowItem(cartProduct, quantity);
    router.push("/checkout");
  }

  return (
    <section className="product-page">
      <div className="product-breadcrumbs-row">
        <nav className="breadcrumbs" aria-label="Breadcrumbs">
          <Link href="/">Home</Link>
          <span className="crumb-sep">/</span>
          <Link href="/shop">Shop</Link>
          {product.categorySlug && (
            <>
              <span className="crumb-sep">/</span>
              <Link href={`/category/${product.categorySlug}`}>{categoryName}</Link>
            </>
          )}
          <span className="crumb-sep">/</span>
          <span className="crumb-current" aria-current="page">{product.name}</span>
        </nav>
        <button
          type="button"
          onClick={() => router.back()}
          className="product-back-btn"
          aria-label="Go back"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>
      </div>

      <div className="product-large-visual">
        <img src={product.image || "/hero.png"} alt={product.name} />
        <span className="category-badge">{categoryName}</span>
        <WishlistButton product={cartProduct} className="product-detail-wishlist" />
      </div>

      <div className="product-detail">
        <p className="eyebrow">Made fresh in small batches</p>
        <h1>{product.name}</h1>

        {/* Price */}
        <div className="price-section">
          <div className="price">
            <strong>{formatPrice(displayPrice)}</strong>
            {hasDiscount && <s>{formatPrice(basePrice)}</s>}
          </div>
          {hasDiscount && (
            <span className="savings">Save {formatPrice(basePrice - displayPrice)}</span>
          )}
          {isOutOfStock && (
            <span className="out-of-stock-badge">Out of Stock</span>
          )}
        </div>

        {/* Weight / variant selector */}
        {hasVariants ? (
          <div className="variant-selector">
            <div className="variant-header">
              <p className="variant-label">Select Pack Size</p>
              <span className="variant-helper">Freshly Packed</span>
            </div>
            <div className="variant-options">
              {variants.map((v) => {
                const vBase = parseFloat(v.price) || 0;
                const vOffer = v.offerPrice ? parseFloat(v.offerPrice) : vBase;
                const isSelected = selectedVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={`variant-btn${isSelected ? " variant-btn--active" : ""}`}
                    onClick={() => handleVariantSelect(v)}
                  >
                    <span className="variant-weight">{formatWeight(v.weight)}</span>
                    <span className="variant-price">{formatPrice(vOffer)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="description">{product.description}</p>

        <div className="detail-list">
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <div>
              <span>Weight</span>
              <strong>{formatWeight(displayWeight)}</strong>
            </div>
          </div>
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div>
              <span>Shelf life</span>
              <strong>{product.shelfLife || '30 days'}</strong>
            </div>
          </div>
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              <path d="M9 2v4M15 2v4M3 9h18" />
            </svg>
            <div>
              <span>Ingredients</span>
              <strong>{product.ingredients}</strong>
            </div>
          </div>
        </div>

        {/* Purchase row */}
        <div className="product-purchase-row">
          <div className="quantity-selector-compact">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >−</button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
            >+</button>
          </div>
          <button
            className={`button wide-button ${isOutOfStock ? "button-disabled" : added ? "button-success" : inCart ? "button-dark" : "button-dark"}`}
            onClick={handleAddToCart}
            disabled={added || isOutOfStock}
            style={isOutOfStock ? { opacity: 0.5, cursor: "not-allowed" } : added ? { cursor: "default" } : undefined}
          >
            {isOutOfStock ? "Out of Stock" : added ? "✓ Added to Cart" : inCart ? "+ Add More" : "Add to Cart"}
          </button>
          {!isOutOfStock && (
            <button
              type="button"
              className="button buy-now-button wide-button"
              onClick={handleBuyNow}
              disabled={redirecting}
            >
              {redirecting ? "Redirecting…" : "Buy Now"}
            </button>
          )}
        </div>

        {/* Product Trust Strip */}
        <div className="product-trust-strip">
          <div className="trust-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>100% Pure Natural</span>
          </div>
          <div className="trust-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Small-Batch Daily</span>
          </div>
          <div className="trust-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span>Pan-India Safe Pack</span>
          </div>
        </div>
      </div>
    </section>
  );
}

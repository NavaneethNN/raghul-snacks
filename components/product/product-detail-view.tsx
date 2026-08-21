"use client";

import { useState } from "react";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";
import { useToast } from "@/components/toast-provider";
import { setBuyNowItem } from "@/lib/buy-now";
import { useRouter } from "next/navigation";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductDetailView({ product }: { product: any }) {
  const router = useRouter();
  const { addItem, getItemQuantity } = useCart();
  const { show } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const cartProduct = {
    ...product,
    id: String(product.id),
    slug: product.slug || "",
    name: product.name || "",
    price: parseFloat(product.price) || 0,
    offerPrice: product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price),
    weight: product.weight || "",
    description: product.description || "",
    ingredients: product.ingredients || "",
    category: product.categorySlug || product.category || "",
    image: product.image || "",
  };

  const cartQuantity = getItemQuantity(product.id);
  const inCart = cartQuantity > 0;
  const isAdded = inCart || added;
  const displayPrice = cartProduct.offerPrice;
  const originalPrice = cartProduct.price;
  const categoryName =
    product.categoryName ||
    product.categorySlug?.replace("-", " ") ||
    product.category?.replace("-", " ") ||
    "";
  const hasDiscount = product.offerPrice && displayPrice < originalPrice;

  function handleAddToCart() {
    if (isAdded) return;
    addItem(cartProduct, quantity);
    show(`✓ ${product.name} added to cart`);
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
      <button
        type="button"
        onClick={() => router.back()}
        className="product-back-btn"
        aria-label="Go back"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" />
          <path d="M12 5l-7 7 7 7" />
        </svg>
        Back
      </button>
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
            {hasDiscount && <s>{formatPrice(originalPrice)}</s>}
          </div>
          {hasDiscount && (
            <span className="savings">Save {formatPrice(originalPrice - displayPrice)}</span>
          )}
        </div>

        <p className="description">{product.description}</p>

        <div className="detail-list">
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <div>
              <span>Weight</span>
              <strong>{formatWeight(product.weight)}</strong>
            </div>
          </div>
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <div>
              <span>Shelf life</span>
              <strong>30 days</strong>
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

        {/* Purchase row: quantity + Add to Cart + Buy Now all in one line */}
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
            className={`button wide-button ${isAdded ? "button-success" : "button-dark"}`}
            onClick={handleAddToCart}
            disabled={isAdded}
            style={isAdded ? { opacity: 1, cursor: "default" } : undefined}
          >
            {isAdded ? "✓ Added to Cart" : "Add to Cart"}
          </button>
          <button
            type="button"
            className="button buy-now-button wide-button"
            onClick={handleBuyNow}
            disabled={redirecting}
          >
            {redirecting ? "Redirecting…" : "Buy Now"}
          </button>
        </div>
      </div>
    </section>
  );
}

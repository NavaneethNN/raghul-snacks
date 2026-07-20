"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/catalog";
import { useCart } from "@/components/cart/cart-provider";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductDetailView({ product }: { product: any }) {
  const router = useRouter();
  const { addItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Ensure product has the correct structure for cart
  const cartProduct = {
    ...product,
    id: String(product.id), // Convert to string for consistency
    slug: product.slug || '',
    name: product.name || '',
    price: parseFloat(product.price) || 0,
    offerPrice: product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price),
    weight: product.weight || '',
    description: product.description || '',
    ingredients: product.ingredients || '',
    category: product.categorySlug || product.category || '',
    image: product.image || '',
  };

  const cartQuantity = getItemQuantity(product.id);
  const inCart = cartQuantity > 0;

  const displayPrice = cartProduct.offerPrice;
  const originalPrice = cartProduct.price;
  const categoryName = product.categoryName || product.categorySlug?.replace("-", " ") || product.category?.replace("-", " ") || '';
  const hasDiscount = product.offerPrice && displayPrice < originalPrice;

  function handleAddToCart() {
    addItem(cartProduct, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <section className="product-page">
      <div className="product-large-visual">
        <img src={product.image || "/hero.png"} alt={product.name} />
        <span className="category-badge">{categoryName}</span>
        <WishlistButton product={cartProduct} className="product-detail-wishlist" />
      </div>

      <div className="product-detail">
        <p className="eyebrow">Made fresh in small batches</p>
        <h1>{product.name}</h1>

        <div className="price-section">
          <div className="price">
            <strong>{formatPrice(displayPrice)}</strong>
            {hasDiscount && <s>{formatPrice(originalPrice)}</s>}
          </div>
          {hasDiscount && <span className="savings">Save {formatPrice(originalPrice - displayPrice)}</span>}
        </div>

        <p className="description">{product.description}</p>

        <div className="detail-list">
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
            <div>
              <span>Weight</span>
              <strong>{product.weight}</strong>
            </div>
          </div>
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
            <div>
              <span>Shelf life</span>
              <strong>30 days</strong>
            </div>
          </div>
          <div className="detail-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"></path>
              <path d="M9 2v4"></path>
              <path d="M15 2v4"></path>
              <path d="M3 9h18"></path>
            </svg>
            <div>
              <span>Ingredients</span>
              <strong>{product.ingredients}</strong>
            </div>
          </div>
        </div>

        {!inCart && (
          <div className="quantity-control">
            <label>Quantity</label>
            <div className="quantity-selector-inline">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
        )}

        <button
          className={`button ${inCart || added ? 'button-success' : 'button-dark'} wide-button`}
          onClick={handleAddToCart}
        >
          {inCart || added ? "✓ Added to Cart" : `Add ${quantity} to Cart`}
        </button>

        <p className="shipping-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14"></path>
            <path d="M12 5l7 7-7 7"></path>
          </svg>
          Free delivery on orders above ₹499
        </p>
      </div>
    </section>
  );
}

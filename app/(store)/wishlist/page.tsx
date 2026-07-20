"use client";

import Link from "next/link";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { WishlistButton } from "@/components/wishlist-button";

export default function WishlistPage() {
  const { items } = useWishlist();

  if (!items.length) {
    return (
      <section className="empty-state">
        <p className="eyebrow">Your wishlist</p>
        <h1>Nothing saved yet.</h1>
        <p>Browse our collection and save your favorites for later.</p>
        <Link className="button button-dark" href="/shop">
          Explore Snacks
        </Link>
      </section>
    );
  }

  return (
    <section className="wishlist-page">
      <div className="wishlist-header">
        <div>
          <p className="eyebrow">Your favorites</p>
          <h1>Wishlist ({items.length})</h1>
          <p>Products you've saved for later</p>
        </div>
      </div>

      <div className="product-grid">
        {items.map((item) => {
          const displayPrice = item.offerPrice || item.price;
          const hasDiscount = item.offerPrice && item.offerPrice < item.price;

          return (
            <article key={item.id} className="product-card">
              <Link href={`/product/${item.slug}`} className="product-visual">
                {item.image ? (
                  <img src={item.image} alt={item.name} />
                ) : (
                  <div className="product-visual-placeholder">
                    <span className="placeholder-icon">✦</span>
                  </div>
                )}
              </Link>
              <WishlistButton product={item} />
              <div className="product-copy">
                <p>{formatWeight(item.weight)}</p>
                <Link href={`/product/${item.slug}`}>
                  <h3>{item.name}</h3>
                </Link>
                <div className="price">
                  <strong>{formatPrice(displayPrice)}</strong>
                  {hasDiscount && <s>{formatPrice(item.price)}</s>}
                </div>
                <Link href={`/product/${item.slug}`} className="button button-dark">
                  View Product
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

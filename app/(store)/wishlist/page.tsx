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
                {(item as any).variants?.filter((v: any) => v.active !== false).length > 0 && (
                  <span className="variant-icon" aria-label="Multiple sizes available">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                      <line x1="12" y1="12" x2="12" y2="17"/>
                      <line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
                    </svg>
                  </span>
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

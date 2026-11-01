"use client";

import Link from "next/link";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { formatPrice } from "@/lib/catalog";
import { formatDisplayWeight, getDefaultVariant, resolveCardPricing, sortVariants } from "@/lib/product-pricing";
import { VariantStackFlag } from "@/components/product/variant-stack-flag";
import { WishlistButton } from "@/components/wishlist-button";
import { AddToCart } from "@/components/product/add-to-cart";

export default function WishlistPage() {
  const { items, hydrated, removeItem, clearWishlist } = useWishlist();

  if (!hydrated) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--line)", borderTopColor: "var(--terracotta)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

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
          <p>Products you&apos;ve saved for later</p>
        </div>
      </div>

      <div className="product-grid">
        {items.map((item) => {
          const pricing = resolveCardPricing(item);
          const variants = sortVariants(item.variants);

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
                {variants.length > 0 && <VariantStackFlag count={variants.length} />}
              </Link>
              <WishlistButton product={item} />
              <div className="product-copy">
                {pricing.displayWeight && <p>{pricing.displayWeight}</p>}
                <Link href={`/product/${item.slug}`}>
                  <h3>{item.name}</h3>
                </Link>
                {pricing.hasPrice && (
                  <div className="price">
                    <strong>{formatPrice(pricing.displayPrice)}</strong>
                    {pricing.hasDiscount && <s>{formatPrice(pricing.originalPrice)}</s>}
                  </div>
                )}
                {(() => {
                  const firstVariant = getDefaultVariant(item.variants);
                  const isCombo = item.slug?.startsWith("combo-") || item.weight === "Combo";
                  const cartProduct = {
                    id: firstVariant ? `${item.id}-v${firstVariant.id}` : String(item.id),
                    slug: item.slug || "",
                    name: item.name || "",
                    price: pricing.originalPrice,
                    offerPrice: pricing.hasPrice ? pricing.displayPrice : pricing.originalPrice,
                    weight: isCombo ? "Combo Pack" : formatDisplayWeight(firstVariant ? firstVariant.weight : item.weight),
                    approxWeight: firstVariant?.approxWeight || firstVariant?.weight || item.weight,
                    variantType: firstVariant?.variantType || "weight",
                    description: "",
                    ingredients: "",
                    category: "",
                    image: item.image || "",
                  };

                  return (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      {variants.length > 1 ? (
                        <Link href={`/product/${item.slug}`} className="button button-dark" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                          Select Size
                        </Link>
                      ) : (
                        <div style={{ flex: 1 }}>
                          <AddToCart product={cartProduct as any} className="button-dark wide-button" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        title="Remove from wishlist"
                        aria-label="Remove from wishlist"
                        style={{
                          background: "var(--cream)",
                          border: "1.5px solid var(--line)",
                          borderRadius: 6,
                          padding: "8px 10px",
                          cursor: "pointer",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

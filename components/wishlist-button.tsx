"use client";

import { useState, useRef, useEffect } from "react";
import { useWishlist, type WishlistVariant } from "@/components/wishlist/wishlist-provider";

type Product = {
  id: string | number;
  name: string;
  slug: string;
  price: number;
  offerPrice: number;
  weight: string;
  image: string | null;
  /** Pack-size options, carried along so saved cards keep their size flag. */
  variants?: WishlistVariant[];
};

export function WishlistButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const inWishlist = isInWishlist(product.id);
  const [isBouncing, setIsBouncing] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "removed" | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger spring bounce & sparkle burst
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 650);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (inWishlist) {
      removeItem(product.id);
      setFeedback("removed");
      timerRef.current = setTimeout(() => setFeedback(null), 1400);
    } else {
      addItem({
        id: String(product.id),
        name: product.name,
        slug: product.slug,
        price: product.price,
        offerPrice: product.offerPrice,
        weight: product.weight,
        image: product.image,
        variants: product.variants ?? [],
      });
      setFeedback("saved");
      timerRef.current = setTimeout(() => setFeedback(null), 1400);
    }
  };

  return (
    <div className={`wishlist-wrapper ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        className={`wishlist-toggle ${inWishlist ? "active" : ""} ${isBouncing ? "animating" : ""}`}
        title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={inWishlist}
      >
        {/* Shockwave ripple ring on click */}
        {isBouncing && <span className="wishlist-ripple" aria-hidden="true" />}

        {/* 6 Radiant celebration sparkles when favorited */}
        {isBouncing && inWishlist && (
          <span className="wishlist-sparkles-burst" aria-hidden="true">
            <span className="sparkle s1" />
            <span className="sparkle s2" />
            <span className="sparkle s3" />
            <span className="sparkle s4" />
            <span className="sparkle s5" />
            <span className="sparkle s6" />
          </span>
        )}

        {/* Precision Lucide/Feather Curved Heart SVG */}
        <svg
          className="wishlist-heart-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={inWishlist ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={inWishlist ? "0" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* Floating feedback badge */}
      {feedback && (
        <span
          className={`wishlist-pill-toast ${feedback === "saved" ? "toast-saved" : "toast-removed"}`}
          role="status"
        >
          {feedback === "saved" ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Saved</span>
            </>
          ) : (
            <span>Removed</span>
          )}
        </span>
      )}
    </div>
  );
}

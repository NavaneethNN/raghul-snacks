"use client";

import { useWishlist } from "@/components/wishlist/wishlist-provider";

type Product = {
  id: string | number;
  name: string;
  slug: string;
  price: number;
  offerPrice: number;
  weight: string;
  image: string | null;
};

export function WishlistButton({ product, className = "" }: { product: Product; className?: string }) {
  const { isInWishlist, addItem, removeItem } = useWishlist();
  const inWishlist = isInWishlist(product.id);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inWishlist) {
      removeItem(product.id);
    } else {
      addItem({
        id: String(product.id),
        name: product.name,
        slug: product.slug,
        price: product.price,
        offerPrice: product.offerPrice,
        weight: product.weight,
        image: product.image,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`wishlist-toggle ${inWishlist ? 'active' : ''} ${className}`}
      title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill={inWishlist ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
        <path d="M10 17.5C10 17.5 2 13 2 7.5C2 4.74 4 3 6 3C7.5 3 9 4 10 5C11 4 12.5 3 14 3C16 3 18 4.74 18 7.5C18 13 10 17.5 10 17.5Z" />
      </svg>
    </button>
  );
}

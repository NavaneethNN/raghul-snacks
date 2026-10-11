import Link from "next/link";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { AddToCart } from "@/components/product/add-to-cart";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductCard({ product }: { product: any }) {
  const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
  const activeVariants = variants.filter((v: any) => v.active !== false);
  // Already sorted by the API; use first item as representative
  const firstVariant = activeVariants[0] ?? null;

  const displayPrice = firstVariant
    ? (firstVariant.offerPrice && parseFloat(firstVariant.offerPrice) > 0
        ? parseFloat(firstVariant.offerPrice)
        : parseFloat(firstVariant.price))
    : (product.offerPrice && parseFloat(product.offerPrice) > 0
        ? parseFloat(product.offerPrice)
        : parseFloat(product.price));

  const originalPrice = firstVariant
    ? parseFloat(firstVariant.price)
    : parseFloat(product.price);

  const displayWeight = firstVariant ? firstVariant.weight : product.weight;

  const hasDiscount = displayPrice < originalPrice;
  const priceLabel = activeVariants.length >= 2 ? 'from ' : '';

  const categoryName = product.categoryName || product.categorySlug?.replace("-", " ") || product.category?.replace("-", " ") || '';
  const badge = product.bestseller ? 'Bestseller' : product.featured ? 'Featured' : null;

  // Ensure product has the correct structure for cart
  const cartProduct = {
    ...product,
    id: String(product.id),
    slug: product.slug || '',
    name: product.name || '',
    price: originalPrice,
    offerPrice: displayPrice,
    weight: displayWeight || '',
    description: product.description || '',
    ingredients: product.ingredients || '',
    category: product.categorySlug || product.category || '',
    image: product.image || '',
  };

  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} className="product-visual">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="product-visual-placeholder">
            <span className="placeholder-icon">✦</span>
          </div>
        )}
        <span className="category-label">{categoryName}</span>
        {badge && <b>{badge}</b>}
        {activeVariants.length > 0 && (
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
      <WishlistButton product={cartProduct} />
      <div className="product-copy">
        <p>{formatWeight(displayWeight)}</p>
        <Link href={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="price">
          <strong>{priceLabel}{formatPrice(displayPrice)}</strong>
          {hasDiscount && <s>{formatPrice(originalPrice)}</s>}
        </div>
        <div className="product-actions">
          <AddToCart product={cartProduct} showModal={true} />
        </div>
      </div>
    </article>
  );
}

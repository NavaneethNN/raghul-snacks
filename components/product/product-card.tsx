import Link from "next/link";
import { formatPrice, formatWeight } from "@/lib/catalog";
import { AddToCart } from "@/components/product/add-to-cart";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductCard({ product }: { product: any }) {
  const displayPrice = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
  const originalPrice = parseFloat(product.price);
  const categoryName = product.categoryName || product.categorySlug?.replace("-", " ") || product.category?.replace("-", " ") || '';
  const badge = product.bestseller ? 'Bestseller' : product.featured ? 'Featured' : null;

  // Ensure product has the correct structure for cart
  const cartProduct = {
    ...product,
    id: String(product.id), // Convert to string for consistency
    slug: product.slug || '',
    name: product.name || '',
    price: originalPrice,
    offerPrice: displayPrice,
    weight: product.weight || '',
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
      </Link>
      <WishlistButton product={cartProduct} />
      <div className="product-copy">
        <p>{formatWeight(product.weight)}</p>
        <Link href={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="price">
          <strong>{formatPrice(displayPrice)}</strong>
          {product.offerPrice && <s>{formatPrice(originalPrice)}</s>}
        </div>
        <AddToCart product={cartProduct} showModal={true} />
      </div>
    </article>
  );
}

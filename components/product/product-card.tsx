import Link from "next/link";
import { formatPrice } from "@/lib/catalog";
import {
  formatDisplayWeight,
  getDefaultVariant,
  resolveCardPricing,
  sortVariants,
} from "@/lib/product-pricing";
import { AddToCart } from "@/components/product/add-to-cart";
import { VariantStackFlag } from "@/components/product/variant-stack-flag";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductCard({ product }: { product: any }) {
  const pricing = resolveCardPricing(product);
  const variants = sortVariants(product.variants);
  const firstVariant = getDefaultVariant(product.variants);

  const categoryName =
    product.categoryName ||
    product.categorySlug?.replace("-", " ") ||
    product.category?.replace("-", " ") ||
    "";
  const badge = null; // Bestseller/Featured badges removed
  const isOutOfStock = product.active === false || (typeof product.stock === "number" && product.stock <= 0);

  // The card advertises the first variant, so its cart entry is that variant too —
  // the same id the product page uses, so both add to a single cart line.
  const cartProduct = {
    ...product,
    id: firstVariant ? `${product.id}-v${firstVariant.id}` : String(product.id),
    slug: product.slug || "",
    name: product.name || "",
    price: pricing.originalPrice,
    offerPrice: pricing.hasPrice ? pricing.displayPrice : pricing.originalPrice,
    weight: formatDisplayWeight(firstVariant ? firstVariant.weight : product.weight),
    description: product.description || "",
    ingredients: product.ingredients || "",
    category: product.categorySlug || product.category || "",
    image: product.image || "",
  };

  // The wishlist is keyed by product, not by variant, so it keeps its own id.
  const wishlistProduct = {
    ...cartProduct,
    id: String(product.id),
    variants: variants.map((variant) => ({
      id: variant.id,
      weight: variant.weight,
      price: variant.price,
      offerPrice: variant.offerPrice,
      sortOrder: variant.sortOrder,
    })),
  };

  return (
    <article className="product-card">
      <Link href={`/product/${product.slug}`} className="product-visual">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        ) : (
          <div className="product-visual-placeholder">
            <span className="placeholder-icon">✦</span>
          </div>
        )}
        {isOutOfStock && <b className="out-of-stock-label">Out of Stock</b>}
        {variants.length > 0 && <VariantStackFlag count={variants.length} />}
      </Link>
      <WishlistButton product={wishlistProduct} />
      <div className="product-copy">
        {pricing.displayWeight && <p>{pricing.displayWeight}</p>}
        <Link href={`/product/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        {pricing.hasPrice && (
          <div className="price">
            <strong>{formatPrice(pricing.displayPrice)}</strong>
            {pricing.hasDiscount && <s>{formatPrice(pricing.originalPrice)}</s>}
          </div>
        )}
        <div className="product-actions">
          {isOutOfStock ? (
            <button className="button button-dark" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>Out of Stock</button>
          ) : (
            <AddToCart product={cartProduct} showModal={true} />
          )}
        </div>
      </div>
    </article>
  );
}

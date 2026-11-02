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
  const isCombo =
    product.categorySlug === "combos" ||
    product.categoryName?.toLowerCase() === "combos" ||
    product.category?.toLowerCase() === "combos";

  // The card advertises the first variant, so its cart entry is that variant too —
  // the same id the product page uses, so both add to a single cart line.
  const cartProduct = {
    ...product,
    id: firstVariant ? `${product.id}-v${firstVariant.id}` : String(product.id),
    slug: product.slug || "",
    name: product.name || "",
    price: pricing.originalPrice,
    offerPrice: pricing.hasPrice ? pricing.displayPrice : pricing.originalPrice,
    weight: isCombo ? "Combo Pack" : formatDisplayWeight(firstVariant ? firstVariant.weight : product.weight),
    approxWeight: firstVariant?.approxWeight || firstVariant?.weight || product.weight,
    variantType: firstVariant?.variantType || "weight",
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
            <span className="placeholder-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </span>
          </div>
        )}
        {isOutOfStock && <b className="out-of-stock-label">Out of Stock</b>}
        {isCombo && (
          <span style={{ position: "absolute", top: 10, left: 10, zIndex: 2, background: "var(--terracotta)", color: "#fff", padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Combo</span>
        )}
        {variants.length > 0 && <VariantStackFlag count={variants.length} />}
      </Link>
      <WishlistButton product={wishlistProduct} />
      <div className="product-copy">
        {isCombo ? (
          <p style={{ color: "var(--terracotta)", fontWeight: 700, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em" }}>Combo Pack</p>
        ) : (
          pricing.displayWeight && <p>{pricing.displayWeight}</p>
        )}
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

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { AddToCart } from "@/components/product/add-to-cart";

export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card"><Link href={`/product/${product.slug}`} className="product-visual"><span>{product.category.replace("-", " ")}</span>{product.badge && <b>{product.badge}</b>}</Link><div className="product-copy"><p>{product.weight}</p><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link><div className="price"><strong>{formatPrice(product.offerPrice)}</strong><s>{formatPrice(product.price)}</s></div><AddToCart product={product} showModal={true} /></div></article>;
}

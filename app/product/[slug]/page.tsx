import { notFound } from "next/navigation";
import { AddToCart } from "@/components/product/add-to-cart";
import { ProductCard } from "@/components/product/product-card";
import { formatPrice, products } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const recommendations = products.filter((item) => item.id !== product.id).slice(0, 3);
  return <><section className="product-page"><div className="product-large-visual"><span>{product.category}</span><div className="grain">✦</div></div><div className="product-detail"><p className="eyebrow">Made fresh in small batches</p><h1>{product.name}</h1><div className="price"><strong>{formatPrice(product.offerPrice)}</strong><s>{formatPrice(product.price)}</s><em>Save {formatPrice(product.price - product.offerPrice)}</em></div><p className="description">{product.description}</p><div className="detail-list"><p><span>Weight</span>{product.weight}</p><p><span>Ingredients</span>{product.ingredients}</p><p><span>Shelf life</span>90 days</p></div><AddToCart product={product} className="wide-button" /><p className="shipping-note">✓ Free delivery on orders above ₹499</p></div></section><section className="section"><div className="section-heading"><div><p className="eyebrow">Pairs beautifully with</p><h2>Frequently bought together.</h2></div></div><div className="product-grid">{recommendations.map((item) => <ProductCard product={item} key={item.id} />)}</div></section></>;
}

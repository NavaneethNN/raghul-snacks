import { ProductCard } from "@/components/product/product-card";
import { categories, products } from "@/lib/catalog";

export default function ShopPage() {
  return <section className="section shop-page"><p className="eyebrow">The full pantry</p><h1>Find your next favourite.</h1><div className="filter-row"><span>All products</span>{categories.map((category) => <a href={`/shop/${category.slug}`} key={category.slug}>{category.name}</a>)}</div><div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}

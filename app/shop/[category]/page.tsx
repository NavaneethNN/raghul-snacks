import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { categories, products } from "@/lib/catalog";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const items = products.filter((product) => product.category === slug);
  return <section className="section shop-page"><p className="eyebrow">{category.detail}</p><h1>{category.name}</h1><div className="product-grid">{items.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}

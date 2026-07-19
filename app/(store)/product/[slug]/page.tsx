import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { formatPrice, products } from "@/lib/catalog";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const recommendations = products.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <>
      <ProductDetailView product={product} />

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Pairs beautifully with</p>
            <h2>Frequently bought together.</h2>
          </div>
        </div>
        <div className="product-grid">
          {recommendations.map((item) => (
            <ProductCard product={item} key={item.id} />
          ))}
        </div>
      </section>
    </>
  );
}

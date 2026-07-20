import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailView } from "@/components/product/product-detail-view";

async function getProducts() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((item: any) => item.slug === slug);

  if (!product) notFound();

  const recommendations = products.filter((item: any) => item.id !== product.id).slice(0, 3);

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
          {recommendations.map((item: any) => (
            <ProductCard product={item} key={item.id} />
          ))}
        </div>
      </section>
    </>
  );
}

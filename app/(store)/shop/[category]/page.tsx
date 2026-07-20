import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/categories`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getProducts(categorySlug: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products?category=${categorySlug}`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const categories = await getCategories();
  const category = categories.find((item: any) => item.slug === slug);

  if (!category) notFound();

  const items = await getProducts(slug);

  return (
    <section className="section shop-page">
      <p className="eyebrow">{category.description || 'Explore our collection'}</p>
      <h1>{category.name}</h1>
      <div className="product-grid">
        {items.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

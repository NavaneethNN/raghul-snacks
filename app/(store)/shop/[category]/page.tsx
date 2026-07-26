import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";

async function getCategories() {
  try {
    const res = await fetch('/api/categories', {
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
    const res = await fetch(`/api/products?category=${categorySlug}`, {
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
  console.log('Categories from API:', categories);
  console.log('Looking for slug:', slug);
  const category = categories.find((item: any) => item.slug === slug);
  console.log('Found category:', category);

  if (!category) {
    console.log('Category not found, available slugs:', categories.map((c: any) => c.slug));
    notFound();
  }

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

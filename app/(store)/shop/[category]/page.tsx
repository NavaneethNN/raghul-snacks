import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { getDb } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getProductsWithVariants } from "@/lib/db-queries";

export const dynamic = 'force-dynamic';

async function getCategory(slug: string) {
  try {
    const db = getDb();
    const result = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching category:', error);
    return null;
  }
}

async function getProducts(categorySlug: string) {
  try {
    const db = getDb();
    const category = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
    if (!category || category.length === 0) return [];

    const allProducts = await getProductsWithVariants(db);
    return allProducts.filter((p: any) => p.categoryId === category[0].id);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = await getCategory(slug);

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

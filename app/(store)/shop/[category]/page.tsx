import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { getDb } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getProductsWithVariants } from "@/lib/db-queries";

export const revalidate = 120;

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

async function getProductsByCategoryId(categoryId: number) {
  try {
    const db = getDb();
    return await getProductsWithVariants(db, { categoryId });
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = await getCategory(slug);

  if (!category) notFound();

  const items = await getProductsByCategoryId(category.id);

  return (
    <section className="section shop-page">
      <p className="eyebrow">{category.description || 'Explore our collection'}</p>
      <h1>{category.name}</h1>
      {items.length === 0 ? (
        <div className="empty-state">
          <p>No snacks currently available in this category.</p>
          <Link href="/shop" className="button button-dark" style={{ marginTop: 16 }}>
            Browse all snacks →
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {items.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}

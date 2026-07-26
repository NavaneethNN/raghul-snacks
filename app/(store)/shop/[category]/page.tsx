import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { getDb } from "@/lib/db";
import { products, categories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

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
    
    return await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        ingredients: products.ingredients,
        price: products.price,
        offerPrice: products.offerPrice,
        weight: products.weight,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        image: products.image,
        featured: products.featured,
        bestseller: products.bestseller,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.categoryId, category[0].id));
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

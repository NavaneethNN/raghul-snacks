import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { ProductReviews } from "@/components/product/product-reviews";
import { ReviewForm } from "@/components/product/review-form";
import { getDb } from "@/lib/db";
import { products, categories, productVariants } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { getProductsWithVariants } from "@/lib/db-queries";

export const revalidate = 120;

const getProduct = cache(async (slug: string) => {
  try {
    const db = getDb();
    const result = await db
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
                active: products.active,
        shelfLife: products.shelfLife,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
});

async function getVariants(productId: number) {
  try {
    const db = getDb();
    return await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.active, true)))
      .orderBy(productVariants.sortOrder);
  } catch {
    return [];
  }
}

// Recommendations reuse the shared query with a limit to avoid loading the entire catalog.
async function getRecommendations(categoryId: number | null, currentProductId: number) {
  try {
    const db = getDb();
    let recs: any[] = [];
    if (categoryId) {
      const sameCat = await getProductsWithVariants(db, { categoryId, limit: 4 });
      recs = sameCat.filter((p: any) => p.id !== currentProductId);
    }
    if (recs.length < 3) {
      const more = await getProductsWithVariants(db, { limit: 6 });
      const existingIds = new Set([currentProductId, ...recs.map((r: any) => r.id)]);
      for (const item of more) {
        if (!existingIds.has(item.id)) {
          recs.push(item);
          existingIds.add(item.id);
          if (recs.length >= 3) break;
        }
      }
    }
    return recs.slice(0, 3);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} | Raghul Delights`,
    description: product.description || `Buy ${product.name} — handcrafted fresh millet snacks from Raghul Delights.`,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const [variants, recommendations] = await Promise.all([
    getVariants(product.id),
    getRecommendations(product.categoryId, product.id),
  ]);

  return (
    <>
      <ProductDetailView product={product} variants={variants} />

      <ProductReviews productId={product.id} />

      <ReviewForm productId={product.id} />

      <section className="section shop-page">
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

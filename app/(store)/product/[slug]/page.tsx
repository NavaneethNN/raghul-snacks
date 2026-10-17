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

export const revalidate = 60;

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
        featured: products.featured,
        bestseller: products.bestseller,
        stock: products.stock,
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

// Recommendations reuse the shared query so cards can show variant pricing.
async function getProducts() {
  try {
    const db = getDb();
    return await getProductsWithVariants(db);
  } catch (error) {
    console.error('Error fetching products:', error);
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

  const [variants, allProducts] = await Promise.all([
    getVariants(product.id),
    getProducts(),
  ]);
  const others = allProducts.filter((item: any) => item.id !== product.id);
  const sameCat = product.categoryId
    ? others.filter((item: any) => item.categoryId === product.categoryId)
    : [];
  const diffCat = others.filter((item: any) => item.categoryId !== product.categoryId);
  const recommendations = [...sameCat, ...diffCat].slice(0, 3);

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

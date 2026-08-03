import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { ProductReviews } from "@/components/product/product-reviews";
import { getDb } from "@/lib/db";
import { products, categories } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

async function getProduct(slug: string) {
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
}

async function getProducts() {
  try {
    const db = getDb();
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
      .leftJoin(categories, eq(products.categoryId, categories.id));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  const products = await getProducts();
  const recommendations = products.filter((item: any) => item.id !== product.id).slice(0, 3);

  return (
    <>
      <ProductDetailView product={product} />

      <ProductReviews productId={product.id} />

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

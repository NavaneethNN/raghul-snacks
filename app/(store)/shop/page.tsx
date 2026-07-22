import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { ShopContent } from "@/components/shop-content";
import { getDb } from "@/lib/db";
import { products, categories, combos, comboItems } from "@/drizzle/schema";

export const dynamic = 'force-dynamic';

async function getCategories() {
  try {
    const db = getDb();
    return await db.select().from(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
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
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCombos() {
  try {
    const db = getDb();
    const allCombos = await db.select().from(combos).orderBy(desc(combos.createdAt));
    return await Promise.all(
      allCombos.map(async (combo) => {
        const items = await db
          .select({
            id: comboItems.id,
            productId: comboItems.productId,
            quantity: comboItems.quantity,
            name: products.name,
          })
          .from(comboItems)
          .leftJoin(products, eq(comboItems.productId, products.id))
          .where(eq(comboItems.comboId, combo.id));
        return { ...combo, items };
      })
    );
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
}

export default async function ShopPage() {
  const categories = await getCategories();
  const products = await getProducts();
  const combos = await getCombos();

  return (
    <section className="section shop-page">
      <p className="eyebrow">The full pantry</p>
      <h1>Find your next favourite.</h1>
      <Suspense fallback={<div>Loading…</div>}>
        <ShopContent categories={categories} products={products} combos={combos} />
      </Suspense>
    </section>
  );
}

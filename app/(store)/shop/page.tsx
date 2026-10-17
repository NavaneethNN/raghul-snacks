import { Suspense } from "react";
import { desc, eq, inArray } from "drizzle-orm";
import { ShopContent } from "@/components/shop-content";
import { getDb } from "@/lib/db";
import { categories, combos, comboItems, products } from "@/drizzle/schema";
import { getProductsWithVariants } from "@/lib/db-queries";

export const revalidate = 60;

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
    return await getProductsWithVariants(db);
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCombos() {
  try {
    const db = getDb();
    const allCombos = await db.select().from(combos).orderBy(desc(combos.createdAt));
    if (!allCombos || allCombos.length === 0) return [];

    const comboIds = allCombos.map((c) => c.id);
    const allItems = await db
      .select({
        id: comboItems.id,
        comboId: comboItems.comboId,
        productId: comboItems.productId,
        quantity: comboItems.quantity,
        name: products.name,
      })
      .from(comboItems)
      .leftJoin(products, eq(comboItems.productId, products.id))
      .where(inArray(comboItems.comboId, comboIds));

    const itemsByCombo = new Map<number, any[]>();
    for (const item of allItems) {
      const list = itemsByCombo.get(item.comboId) || [];
      list.push(item);
      itemsByCombo.set(item.comboId, list);
    }

    return allCombos.map((combo) => ({
      ...combo,
      items: itemsByCombo.get(combo.id) || [],
    }));
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ search?: string; tab?: string; category?: string }> }) {
  const [params, categories, products, allCombos] = await Promise.all([
    searchParams,
    getCategories(),
    getProducts(),
    getCombos(),
  ]);

  // Only show combos that have at least one item
  const combos = allCombos.filter((c: any) => c.items && c.items.length > 0);
  const searchQuery = params.search || "";

  return (
    <section className="section shop-page">
      <p className="eyebrow">The full pantry</p>
      <h1>Find your next favourite.</h1>
      <Suspense fallback={
        <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--line)", borderTopColor: "var(--terracotta)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      }>
        <ShopContent categories={categories} products={products} combos={combos} searchQuery={searchQuery} />
      </Suspense>
    </section>
  );
}

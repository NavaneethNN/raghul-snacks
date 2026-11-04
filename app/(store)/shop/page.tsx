import { Suspense } from "react";
import { ShopContent } from "@/components/shop-content";
import { getDb } from "@/lib/db";
import { categories } from "@/drizzle/schema";
import { getProductsWithVariants } from "@/lib/db-queries";
import { getOrSetCache } from "@/lib/cache";

export const revalidate = 60;

async function getCategories() {
  return getOrSetCache("shop:categories", 60, async () => {
    try {
      const db = getDb();
      return await db.select().from(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  });
}

async function getProducts() {
  return getOrSetCache("shop:products", 60, async () => {
    try {
      const db = getDb();
      return await getProductsWithVariants(db);
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  });
}

function parseIngredientsToItems(ingredients?: string | null) {
  if (!ingredients) return [];
  return ingredients
    .split(",")
    .map((s: string, idx: number) => {
      const itemStr = s.trim();
      const match = itemStr.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        return {
          id: idx,
          productId: null,
          quantity: 1,
          name: match[1].trim(),
          unitWeight: match[2].trim(),
        };
      }
      return { id: idx, productId: null, quantity: 1, name: itemStr, unitWeight: null };
    })
    .filter((it: any) => Boolean(it.name));
}

export default async function ShopPage() {
  const [allCategories, allProducts] = await Promise.all([
    getCategories(),
    getProducts(),
  ]);

  const regularProducts = allProducts.filter((p: any) => p.categorySlug !== 'combos' && p.categoryName?.toLowerCase() !== 'combos');
  const comboProducts = allProducts
    .filter((p: any) => p.categorySlug === 'combos' || p.categoryName?.toLowerCase() === 'combos')
    .map((p: any) => {
      const parsedItems = parseIngredientsToItems(p.ingredients);
      return {
        ...p,
        title: p.title || p.name,
        name: p.name || p.title,
        price: p.price,
        offerPrice: p.offerPrice || p.discount,
        discount: p.offerPrice || p.discount,
        items: p.items && p.items.length > 0 ? p.items : parsedItems,
      };
    });
  const nonComboCategories = allCategories.filter((c: any) => c.slug !== 'combos');

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
        <ShopContent categories={nonComboCategories} products={regularProducts} combos={comboProducts} />
      </Suspense>
    </section>
  );
}

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

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ search?: string; tab?: string; category?: string }> }) {
  const [params, allCategories, allProducts] = await Promise.all([
    searchParams,
    getCategories(),
    getProducts(),
  ]);

  const regularProducts = allProducts.filter((p: any) => p.categorySlug !== 'combos' && p.categoryName?.toLowerCase() !== 'combos');
  const comboProducts = allProducts.filter((p: any) => p.categorySlug === 'combos' || p.categoryName?.toLowerCase() === 'combos');
  const nonComboCategories = allCategories.filter((c: any) => c.slug !== 'combos');
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
        <ShopContent categories={nonComboCategories} products={regularProducts} combos={comboProducts} searchQuery={searchQuery} />
      </Suspense>
    </section>
  );
}

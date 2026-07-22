import { Suspense } from "react";
import { ShopContent } from "@/components/shop-content";

export const dynamic = 'force-dynamic';

async function getCategories() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/categories`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

async function getProducts() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/products`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

async function getCombos() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/combos`, {
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
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

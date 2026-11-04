import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { products, categories } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Search products by name, description, ingredients, or category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const db = getDb();
    const cleanQuery = query.trim();
    const words = cleanQuery.split(/\s+/).filter(Boolean);

    // Each word must match at least one searchable field
    const wordConditions = words.map((w) => {
      const pattern = `%${w}%`;
      return or(
        ilike(products.name, pattern),
        ilike(products.description, pattern),
        ilike(products.ingredients, pattern),
        ilike(categories.name, pattern),
        ilike(categories.slug, pattern)
      );
    });

    const results = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        offerPrice: products.offerPrice,
        weight: products.weight,
        categoryId: products.categoryId,
        categoryName: categories.name,
        categorySlug: categories.slug,
        image: products.image,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.active, true),
          ...wordConditions
        )
      )
      .limit(10);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}

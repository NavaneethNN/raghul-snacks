import { NextRequest, NextResponse } from "next/server";
import { desc, eq, like, or } from "drizzle-orm";
import { products, categories } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Search products by name, description, or category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const db = getDb();
    const searchTerm = `%${query.trim().toLowerCase()}%`;

    const results = await db
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
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        or(
          like(products.name, searchTerm),
          like(products.description, searchTerm),
          like(products.ingredients, searchTerm),
          like(categories.name, searchTerm)
        )
      )
      .limit(10);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json({ error: "Failed to search products" }, { status: 500 });
  }
}

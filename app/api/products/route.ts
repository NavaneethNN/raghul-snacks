import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { products, categories } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all products (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");
    const featured = searchParams.get("featured");
    const bestseller = searchParams.get("bestseller");

    const db = getDb();
    let query = db
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

    let result = await query;

    // Filter by category slug if provided
    if (categorySlug) {
      result = result.filter((p) => p.categorySlug === categorySlug);
    }

    // Filter by featured if provided
    if (featured === "true") {
      result = result.filter((p) => p.featured === true);
    }

    // Filter by bestseller if provided
    if (bestseller === "true") {
      result = result.filter((p) => p.bestseller === true);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

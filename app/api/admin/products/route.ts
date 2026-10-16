import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq, ilike, or } from "drizzle-orm";
import { products, categories } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Increase body size limit to 10MB for product images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// GET - List all products
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const filter = searchParams.get("filter");

    const db = getDb();
    let productQuery = db
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
        image: products.image,
        featured: products.featured,
        bestseller: products.bestseller,
        stock: products.stock,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt))
      .$dynamic();

    if (query) {
      productQuery = productQuery.where(
        or(ilike(products.name, `%${query}%`), ilike(products.slug, `%${query}%`))
      );
    }

    const result = await productQuery;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      ingredients,
      price,
      offerPrice,
      weight,
      categoryId,
      image,
      featured,
      bestseller,
      shelfLife,
    } = body;

    // Generate slug if not provided
    const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const db = getDb();
    // Validate categoryId exists before inserting
    if (categoryId) {
      const cat = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
      if (!cat[0]) return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }
    const [newProduct] = await db.insert(products).values({
      name,
      slug: productSlug,
      description,
      ingredients: ingredients || null,
      price: price.toString(),
      offerPrice: offerPrice ? offerPrice.toString() : null,
      weight,
      categoryId: categoryId || null,
      image: image || null,
      featured: featured || false,
      bestseller: bestseller || false,
      stock: body.stock !== undefined ? body.stock : 1,
      shelfLife: shelfLife || null,
    }).returning();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

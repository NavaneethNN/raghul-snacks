import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { products, categories, productVariants } from "@/drizzle/schema";
import { AdminProducts } from "@/components/admin-products";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  const db = getDb();
  let productList: Parameters<typeof AdminProducts>[0]["products"] = [];
  let categoryList: Parameters<typeof AdminProducts>[0]["categories"] = [];
  try {
    const rows = await db
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
        shelfLife: products.shelfLife,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));

    // Get variant counts per product in one query
    const variantCounts = await db
      .select({ productId: productVariants.productId, count: count() })
      .from(productVariants)
      .where(eq(productVariants.active, true))
      .groupBy(productVariants.productId);

    const variantCountMap = new Map(variantCounts.map((v) => [v.productId, Number(v.count)]));

    productList = rows.map((p) => ({
      ...p,
      variantCount: variantCountMap.get(p.id) ?? 0,
    }));

    categoryList = await db.select().from(categories).orderBy(categories.name);
  } catch (error) {
    console.error("Error loading products:", error);
  }

  return <AdminProducts products={productList} categories={categoryList} />;
}

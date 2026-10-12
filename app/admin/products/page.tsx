import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { products, categories } from "@/drizzle/schema";
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
    productList = await db
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
      .orderBy(desc(products.createdAt));

    categoryList = await db.select().from(categories).orderBy(categories.name);
  } catch (error) {
    console.error("Error loading products:", error);
  }

  return <AdminProducts products={productList} categories={categoryList} />;
}

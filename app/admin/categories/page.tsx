import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq, count, sql } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { categories, products } from "@/drizzle/schema";
import { AdminCategories } from "@/components/admin-categories";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  const db = getDb();
  let categoryList: Parameters<typeof AdminCategories>[0]["categories"] = [];
  try {
    categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        image: categories.image,
        createdAt: categories.createdAt,
        productCount: sql<number>`cast(count(${products.id}) as integer)`,
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .groupBy(categories.id)
      .orderBy(desc(categories.createdAt));
  } catch (error) {
    console.error("Error loading categories:", error);
  }

  return <AdminCategories categories={categoryList} />;
}

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

  try {
    const db = getDb();
    const categoryList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        image: categories.image,
        createdAt: categories.createdAt,
        productCount: sql<number>`cast(count(${products.id}) as integer)`,
      })
      .from(categories)
      .leftJoin(products, eq(categories.id, products.categoryId))
      .groupBy(categories.id)
      .orderBy(desc(categories.createdAt));

    return <AdminCategories categories={categoryList} />;
  } catch (error) {
    console.error("Error loading categories:", error);
    return <AdminCategories categories={[]} />;
  }
}

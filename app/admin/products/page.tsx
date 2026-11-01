import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
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
        active: products.active,
        stock: products.stock,
        shelfLife: products.shelfLife,
        createdAt: products.createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.createdAt));

    // Get all active variants with price and offerPrice
    const allVariants = await db
      .select({
        productId: productVariants.productId,
        price: productVariants.price,
        offerPrice: productVariants.offerPrice,
      })
      .from(productVariants)
      .where(eq(productVariants.active, true));

    const variantStatsMap = new Map<number, { count: number; minPrice: number; minOffer: string | null }>();
    for (const v of allVariants) {
      const stats = variantStatsMap.get(v.productId) ?? { count: 0, minPrice: Infinity, minOffer: null };
      stats.count += 1;
      const priceNum = parseFloat(v.price);
      if (!isNaN(priceNum) && priceNum > 0 && priceNum < stats.minPrice) {
        stats.minPrice = priceNum;
        stats.minOffer = v.offerPrice;
      }
      variantStatsMap.set(v.productId, stats);
    }

    productList = rows.map((p) => {
      const stats = variantStatsMap.get(p.id);
      const varCount = stats?.count ?? 0;
      const minVarPrice = stats && stats.minPrice !== Infinity ? stats.minPrice.toFixed(2) : null;
      const minVarOffer = stats?.minOffer ?? null;

      // Ensure price is never 0 if variants exist
      const pPriceNum = parseFloat(p.price);
      const finalPrice = minVarPrice && (isNaN(pPriceNum) || pPriceNum <= 0)
        ? minVarPrice
        : p.price;
      const finalOfferPrice = minVarPrice && (isNaN(pPriceNum) || pPriceNum <= 0)
        ? minVarOffer
        : p.offerPrice;

      return {
        ...p,
        price: finalPrice,
        offerPrice: finalOfferPrice,
        variantCount: varCount,
        minVariantPrice: minVarPrice,
        minVariantOfferPrice: minVarOffer,
      };
    });

    categoryList = await db.select().from(categories).orderBy(categories.name);
  } catch (error) {
    console.error("Error loading products:", error);
  }

  return <AdminProducts products={productList} categories={categoryList} />;
}

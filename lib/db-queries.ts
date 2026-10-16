import { desc, eq } from "drizzle-orm";
import { products, categories, productVariants } from "@/drizzle/schema";

export type ProductVariantRow = {
  id: number;
  productId: number;
  weight: string;
  price: string;
  offerPrice: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
};

/**
 * Fetches all products (with category join) and merges active variants onto each product.
 * Returns products enriched with a `variants` array (empty when a product has no variants).
 */
export async function getProductsWithVariants(db: any) {
  // 1. Main products + categories LEFT JOIN (same columns as all existing getProducts() calls)
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
      categorySlug: categories.slug,
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

  // 2. Fetch all active variants in one query
  const allVariants: ProductVariantRow[] = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.active, true));

  // 3. Group variants by productId, sorted by sortOrder ASC, id ASC
  const variantsByProduct = new Map<number, ProductVariantRow[]>();
  for (const v of allVariants) {
    const group = variantsByProduct.get(v.productId) ?? [];
    group.push(v);
    variantsByProduct.set(v.productId, group);
  }
  for (const [, group] of variantsByProduct) {
    group.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  // 4. Merge variants onto each product
  return rows.map((row: any) => ({
    ...row,
    variants: variantsByProduct.get(row.id) ?? [],
  }));
}

import { and, desc, eq, inArray } from "drizzle-orm";
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

export type ProductFilterOptions = {
  categoryId?: number;
  categorySlug?: string;
  ids?: number[];
  limit?: number;
};

/**
 * Fetches products (with category join) and merges active variants onto each product.
 * Supports server-side filtering and limits to drastically minimize Neon database data transfer.
 */
export async function getProductsWithVariants(db: any, options?: ProductFilterOptions) {
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
      active: products.active,
      stock: products.stock,
      shelfLife: products.shelfLife,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt))
    .$dynamic();

  const conditions = [];
  if (options?.categoryId !== undefined) {
    conditions.push(eq(products.categoryId, options.categoryId));
  }
  if (options?.categorySlug) {
    conditions.push(eq(categories.slug, options.categorySlug));
  }
  if (options?.ids && options.ids.length > 0) {
    conditions.push(inArray(products.id, options.ids));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const rows = await query;
  if (!rows || rows.length === 0) {
    return [];
  }

  const productIds = rows.map((r: any) => r.id);
  const allVariants: ProductVariantRow[] = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.active, true), inArray(productVariants.productId, productIds)));

  // Group variants by productId, sorted by sortOrder ASC, id ASC
  const variantsByProduct = new Map<number, ProductVariantRow[]>();
  for (const v of allVariants) {
    const group = variantsByProduct.get(v.productId) ?? [];
    group.push(v);
    variantsByProduct.set(v.productId, group);
  }
  for (const [, group] of variantsByProduct) {
    group.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  // Merge variants onto each product
  return rows.map((row: any) => ({
    ...row,
    variants: variantsByProduct.get(row.id) ?? [],
  }));
}

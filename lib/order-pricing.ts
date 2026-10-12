import { getDb } from "@/lib/db";
import { products as productsTable, productVariants } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

export type RequestedItem = { productId: string; quantity: number };
export type PricedLine = { product: { slug: string; categoryId: number | null; [key: string]: unknown }; quantity: number; lineTotal: number };

/**
 * productId format:
 *   "123"       — plain product, use product.offerPrice
 *   "123-v456"  — product 123 with variant 456, use variant.offerPrice
 */
function parseItemId(productId: string): { baseId: number; variantId: number | null } {
  const match = productId.match(/^(\d+)-v(\d+)$/);
  if (match) return { baseId: parseInt(match[1]), variantId: parseInt(match[2]) };
  const id = parseInt(productId);
  return { baseId: isNaN(id) ? 0 : id, variantId: null };
}

export async function priceOrder(items: RequestedItem[]) {
  const db = getDb();

  const parsed = items.map((item) => {
    const { baseId, variantId } = parseItemId(item.productId);
    if (!baseId) throw new Error(`Invalid product ID: ${item.productId}`);
    return { ...item, baseId, variantId };
  });

  const uniqueProductIds = [...new Set(parsed.map((p) => p.baseId))];
  const uniqueVariantIds = parsed.filter((p) => p.variantId !== null).map((p) => p.variantId as number);

  const [dbProducts, dbVariants] = await Promise.all([
    db.select({
      id: productsTable.id,
      name: productsTable.name,
      slug: productsTable.slug,
      price: productsTable.price,
      offerPrice: productsTable.offerPrice,
      weight: productsTable.weight,
      stock: productsTable.stock,
      categoryId: productsTable.categoryId,
      image: productsTable.image,
      featured: productsTable.featured,
      bestseller: productsTable.bestseller,
    }).from(productsTable).where(inArray(productsTable.id, uniqueProductIds)),
    uniqueVariantIds.length
      ? db.select().from(productVariants).where(and(inArray(productVariants.id, uniqueVariantIds), eq(productVariants.active, true)))
      : Promise.resolve([]),
  ]);

  const lines = parsed.map((item) => {
    const product = dbProducts.find((p) => p.id === item.baseId);
    if (!product) throw new Error("One or more products are no longer available.");
    if (typeof product.stock === "number" && product.stock === 0) {
      throw new Error(`"${product.name}" is currently out of stock.`);
    }

    let offerPrice: number;
    let name = product.name;
    let weight = product.weight;

    if (item.variantId !== null) {
      const variant = dbVariants.find((v) => v.id === item.variantId && v.productId === item.baseId);
      if (!variant) throw new Error(`Variant not found for product ${product.name}.`);
      offerPrice = variant.offerPrice ? parseFloat(variant.offerPrice) : parseFloat(variant.price);
      weight = variant.weight;
    } else {
      offerPrice = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
    }

    return {
      product: {
        ...product,
        name,
        weight,
        price: parseFloat(product.price),
        offerPrice,
      },
      quantity: item.quantity,
      lineTotal: offerPrice * item.quantity,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const weight = Math.max(0.25, lines.reduce((total, line) => total + line.quantity * 0.25, 0));
  return { lines, subtotal, weight };
}

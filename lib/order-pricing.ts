import { getDb } from "@/lib/db";
import { combos as combosTable, products as productsTable, productVariants } from "@/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";
import { parseWeightToKg } from "@/lib/catalog";

export type RequestedItem = { productId: string; quantity: number };
export type PricedLine = { product: { slug: string; categoryId: number | null; [key: string]: unknown }; quantity: number; lineTotal: number };

/**
 * productId format:
 *   "123"          — plain product, use product.offerPrice
 *   "123-v456"     — product 123 with variant 456, use variant.offerPrice
 *   "combo-123"    — combo 123, use combo.discount or combo.price
 */
function parseItemId(productId: string): { baseId: number; variantId: number | null; isCombo: boolean } {
  if (productId.startsWith("combo-")) {
    const id = parseInt(productId.slice(6));
    return { baseId: isNaN(id) ? 0 : id, variantId: null, isCombo: true };
  }
  const match = productId.match(/^(\d+)-v(\d+)$/);
  if (match) return { baseId: parseInt(match[1]), variantId: parseInt(match[2]), isCombo: false };
  const id = parseInt(productId);
  return { baseId: isNaN(id) ? 0 : id, variantId: null, isCombo: false };
}

export async function priceOrder(items: RequestedItem[]) {
  const db = getDb();

  const parsed = items.map((item) => {
    const { baseId, variantId, isCombo } = parseItemId(item.productId);
    if (!baseId) throw new Error(`Invalid product ID: ${item.productId}`);
    return { ...item, baseId, variantId, isCombo };
  });

  const uniqueProductIds = [...new Set(parsed.filter((p) => !p.isCombo).map((p) => p.baseId))];
  const uniqueVariantIds = parsed.filter((p) => !p.isCombo && p.variantId !== null).map((p) => p.variantId as number);
  const uniqueComboIds = [...new Set(parsed.filter((p) => p.isCombo).map((p) => p.baseId))];

  const [dbProducts, dbVariants, dbCombos] = await Promise.all([
    uniqueProductIds.length
      ? db.select({
          id: productsTable.id,
          name: productsTable.name,
          slug: productsTable.slug,
          price: productsTable.price,
          offerPrice: productsTable.offerPrice,
          weight: productsTable.weight,
          active: productsTable.active,
          categoryId: productsTable.categoryId,
          image: productsTable.image,
        }).from(productsTable).where(inArray(productsTable.id, uniqueProductIds))
      : Promise.resolve([]),
    uniqueVariantIds.length
      ? db.select().from(productVariants).where(and(inArray(productVariants.id, uniqueVariantIds), eq(productVariants.active, true)))
      : Promise.resolve([]),
    uniqueComboIds.length
      ? db.select({
          id: combosTable.id,
          title: combosTable.title,
          slug: combosTable.slug,
          price: combosTable.price,
          discount: combosTable.discount,
          image: combosTable.image,
        }).from(combosTable).where(inArray(combosTable.id, uniqueComboIds))
      : Promise.resolve([]),
  ]);

  const lines = parsed.map((item) => {
    if (item.isCombo) {
      const combo = dbCombos.find((c) => c.id === item.baseId);
      if (!combo) throw new Error("One or more combos are no longer available.");
      const offerPrice = combo.discount && parseFloat(combo.discount) > 0 ? parseFloat(combo.discount) : parseFloat(combo.price);
      return {
        product: {
          id: null,
          comboId: combo.id,
          name: combo.title,
          slug: combo.slug,
          price: parseFloat(combo.price),
          offerPrice,
          weight: "Combo",
          variantId: null,
          categoryId: null,
          isCombo: true,
          image: combo.image,
        },
        quantity: item.quantity,
        lineTotal: offerPrice * item.quantity,
        unitWeightKg: parseWeightToKg("500g"),
      };
    }

    const product = dbProducts.find((p) => p.id === item.baseId);
    if (!product) throw new Error("One or more products are no longer available.");
    if (product.active === false) {
      throw new Error(`"${product.name}" is currently out of stock.`);
    }

    let offerPrice: number;
    let name = product.name;
    let weight = product.weight;
    let approxWeight = product.weight;

    if (item.variantId !== null) {
      const variant = dbVariants.find((v) => v.id === item.variantId && v.productId === item.baseId);
      if (!variant) throw new Error(`Variant not found for product ${product.name}.`);
      offerPrice = variant.offerPrice ? parseFloat(variant.offerPrice) : parseFloat(variant.price);
      weight = variant.weight;
      approxWeight = variant.approxWeight || variant.weight;
    } else {
      offerPrice = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
    }
    const unitWeightKg = parseWeightToKg(approxWeight || weight);

    return {
      product: {
        ...product,
        name,
        weight,
        price: parseFloat(product.price),
        offerPrice,
        variantId: item.variantId, // pass through for order item storage
        isCombo: false,
      },
      quantity: item.quantity,
      lineTotal: offerPrice * item.quantity,
      unitWeightKg,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const totalWeightKg = lines.reduce((total, line) => total + line.quantity * line.unitWeightKg, 0);
  const weight = Math.max(0.25, Math.round(totalWeightKg * 1000) / 1000);
  return { lines, subtotal, weight };
}

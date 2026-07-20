import { getDb } from "@/lib/db";
import { products as productsTable } from "@/drizzle/schema";
import { inArray } from "drizzle-orm";

export type RequestedItem = { productId: string; quantity: number };

export async function priceOrder(items: RequestedItem[]) {
  const db = getDb();
  const productIds = items.map(item => {
    const id = parseInt(item.productId);
    if (isNaN(id)) {
      throw new Error(`Invalid product ID: ${item.productId}`);
    }
    return id;
  });

  // Fetch products from database
  const dbProducts = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));

  const lines = items.map((item) => {
    const product = dbProducts.find((candidate) => String(candidate.id) === item.productId);
    if (!product) throw new Error("One or more products are no longer available.");

    const offerPrice = product.offerPrice ? parseFloat(product.offerPrice) : parseFloat(product.price);
    return {
      product: {
        ...product,
        price: parseFloat(product.price),
        offerPrice: offerPrice
      },
      quantity: item.quantity,
      lineTotal: offerPrice * item.quantity
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const weight = Math.max(0.25, lines.reduce((total, line) => total + line.quantity * 0.25, 0));
  return { lines, subtotal, weight };
}

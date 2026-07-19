import { products } from "@/lib/catalog";

export type RequestedItem = { productId: string; quantity: number };

export function priceOrder(items: RequestedItem[]) {
  const lines = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new Error("One or more products are no longer available.");
    return { product, quantity: item.quantity, lineTotal: product.offerPrice * item.quantity };
  });
  return { lines, total: lines.reduce((sum, line) => sum + line.lineTotal, 0) };
}

import { products } from "@/lib/catalog";

export type RequestedItem = { productId: string; quantity: number };

export function priceOrder(items: RequestedItem[]) {
  const lines = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) throw new Error("One or more products are no longer available.");
    return { product, quantity: item.quantity, lineTotal: product.offerPrice * item.quantity };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const weight = Math.max(0.25, lines.reduce((total, line) => total + line.quantity * 0.25, 0));
  return { lines, subtotal, weight };
}

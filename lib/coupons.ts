import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories as categoriesTable, coupons, orders } from "@/drizzle/schema";
import type { PricedLine } from "@/lib/order-pricing";

export type CouponValidationResult =
  | { ok: true; coupon: typeof coupons.$inferSelect; discountAmount: number }
  | { ok: false; error: string };

// Shared by /api/coupons/validate (used when a shopper applies a code) and
// the payment routes (used to enforce the discount server-side so a client
// can never fabricate its own discount amount).
export async function validateCoupon(rawCode: string, subtotal: number, lines: PricedLine[], customerEmail?: string): Promise<CouponValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const db = getDb();
  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!coupon) return { ok: false, error: "Invalid coupon code." };
  if (!coupon.active) return { ok: false, error: "This coupon is no longer active." };

  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom)) return { ok: false, error: "This coupon isn't active yet." };
  if (coupon.validUntil && now > new Date(coupon.validUntil)) return { ok: false, error: "This coupon has expired." };

  const minOrderValue = parseFloat(coupon.minOrderValue || "0");
  if (subtotal < minOrderValue) return { ok: false, error: `Add items worth ₹${minOrderValue} or more to use this coupon.` };

  let eligibleAmount = subtotal;
  if (coupon.applyTo === "products" && coupon.applicableProducts?.length) {
    eligibleAmount = lines.filter((line) => coupon.applicableProducts!.includes(line.product.slug)).reduce((sum, line) => sum + line.lineTotal, 0);
  } else if (coupon.applyTo === "categories" && coupon.applicableCategories?.length) {
    const categoryRows = await db.select().from(categoriesTable);
    const idToSlug = new Map(categoryRows.map((category) => [category.id, category.slug]));
    eligibleAmount = lines.filter((line) => line.product.categoryId && coupon.applicableCategories!.includes(idToSlug.get(line.product.categoryId) || "")).reduce((sum, line) => sum + line.lineTotal, 0);
  }
  if (eligibleAmount <= 0 && coupon.discountType !== "bogo") return { ok: false, error: "This coupon isn't applicable to the items in your cart." };

  if (customerEmail) {
    if (coupon.firstPurchase) {
      const [{ value: priorOrders }] = await db.select({ value: count() }).from(orders).where(eq(orders.email, customerEmail));
      if (Number(priorOrders) > 0) return { ok: false, error: "This coupon is valid only on your first order." };
    }
    if (coupon.perCustomer) {
      const [{ value: usedByCustomer }] = await db.select({ value: count() }).from(orders).where(and(eq(orders.email, customerEmail), eq(orders.couponCode, code)));
      if (Number(usedByCustomer) >= coupon.perCustomer) return { ok: false, error: "You've already used this coupon the maximum number of times." };
    }
  }

  if (coupon.totalUsage) {
    const [{ value: totalUsed }] = await db.select({ value: count() }).from(orders).where(eq(orders.couponCode, code));
    if (Number(totalUsed) >= coupon.totalUsage) return { ok: false, error: "This coupon has reached its usage limit." };
  }

  // ── BOGO (Buy 1 Get 1 Free) ───────────────────────────────────────────────
  // Rule: in each pair the customer pays for the higher-priced unit and gets
  // the lower-priced unit free. We expand every eligible line into individual
  // unit prices, sort highest → lowest, then every second unit (index 1, 3, 5…)
  // is free. This correctly handles both same-product and cross-product BOGOs.
  if (coupon.discountType === "bogo") {
    const bogoSlugs = coupon.applicableProducts?.length ? coupon.applicableProducts : null;
    const eligibleLines = bogoSlugs
      ? lines.filter((line) => bogoSlugs.includes(line.product.slug))
      : lines;

    if (eligibleLines.length === 0)
      return { ok: false, error: "This coupon isn't applicable to the items in your cart." };

    // Expand into individual unit prices and sort descending (pay the dearest first)
    const unitPrices: number[] = [];
    for (const line of eligibleLines) {
      const unitPrice = line.lineTotal / line.quantity;
      for (let i = 0; i < line.quantity; i++) unitPrices.push(unitPrice);
    }
    unitPrices.sort((a, b) => b - a);

    // Every odd index (0-based) is the free unit in each pair
    let discountAmount = 0;
    for (let i = 1; i < unitPrices.length; i += 2) {
      discountAmount += unitPrices[i];
    }
    discountAmount = Math.round(discountAmount * 100) / 100;
    return { ok: true, coupon, discountAmount };
  }

  // ── Percentage / Fixed ────────────────────────────────────────────────────
  const value = parseFloat(coupon.value);
  let discountAmount = coupon.discountType === "percentage" ? (eligibleAmount * value) / 100 : value;
  const maxDiscount = coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null;
  if (maxDiscount !== null) discountAmount = Math.min(discountAmount, maxDiscount);
  discountAmount = Math.round(Math.min(discountAmount, eligibleAmount) * 100) / 100;

  return { ok: true, coupon, discountAmount };
}

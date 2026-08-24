import { and, count, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { coupons, orders } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

// GET /api/coupons/eligible
// Returns public active coupons that the current user is actually eligible for.
// Filters out:
//   - firstPurchase coupons if user has prior orders
//   - perCustomer-limited coupons if user has already used them the max times
export async function GET() {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);

  const db = getDb();

  // Fetch all active public coupons
  const allCoupons = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.active, true), eq(coupons.publicCoupon, true)));

  if (!session) {
    // Not logged in — filter out firstPurchase coupons (can't verify, be conservative)
    // Keep everything else visible
    const eligible = allCoupons.filter((c) => !c.firstPurchase);
    return NextResponse.json({ coupons: eligible });
  }

  // Get the user's email and count of prior paid orders
  const userEmail = session.email;

  const [{ value: priorOrderCount }] = await db
    .select({ value: count() })
    .from(orders)
    .where(and(eq(orders.email, userEmail), eq(orders.paymentStatus, "paid")));

  const priorOrders = Number(priorOrderCount);

  // For perCustomer limits — fetch how many times the user used each coupon
  const usageRows = await db
    .select({ couponCode: orders.couponCode, value: count() })
    .from(orders)
    .where(and(eq(orders.email, userEmail), eq(orders.paymentStatus, "paid")))
    .groupBy(orders.couponCode);

  const usageMap = new Map<string, number>();
  for (const row of usageRows) {
    if (row.couponCode) usageMap.set(row.couponCode, Number(row.value));
  }

  const eligible = allCoupons.filter((coupon) => {
    // firstPurchase coupons only valid if user has 0 prior orders
    if (coupon.firstPurchase && priorOrders > 0) return false;

    // perCustomer limit check
    if (coupon.perCustomer) {
      const used = usageMap.get(coupon.code) ?? 0;
      if (used >= coupon.perCustomer) return false;
    }

    // totalUsage limit check
    // Note: this is a best-effort check; final enforcement is server-side at payment time
    // We skip this here to avoid a per-coupon query for every coupon

    return true;
  });

  return NextResponse.json({ coupons: eligible });
}

import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { banners, coupons } from "@/drizzle/schema";

// Shared by the /api/banners route and the server-rendered homepage so both
// return identical data (including validity text derived from the linked
// coupon) without duplicating the query logic.
export async function getBannersWithValidity() {
  const db = getDb();
  const allBanners = await db
    .select()
    .from(banners)
    .orderBy(desc(banners.createdAt));

  // Fetch all coupons in a single query to avoid N+1 problem
  const allCoupons = await db.select().from(coupons);
  const couponMap = new Map(allCoupons.map((c) => [c.code, c]));

  return allBanners.map((banner) => {
    if (banner.couponCode) {
      const coupon = couponMap.get(banner.couponCode);
      if (coupon) {
        let validityText = "";
        if (coupon.validUntil) {
          const untilDate = new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          validityText = `Valid upto ${untilDate}`;
        }

        return {
          ...banner,
          validityText: validityText || banner.validityText,
        };
      }
    }
    return banner;
  });
}

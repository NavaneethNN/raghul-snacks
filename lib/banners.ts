import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { banners, coupons } from "@/drizzle/schema";

// Shared by the /api/banners route and the server-rendered homepage so both
// return identical data (including validity text derived from the linked
// coupon) without duplicating the query logic.
export async function getBannersWithValidity(onlyActive = true) {
  const db = getDb();
  let query = db
    .select({
      id: banners.id,
      eyebrow: banners.eyebrow,
      title: banners.title,
      subtitle: banners.subtitle,
      offerText: banners.offerText,
      couponCode: banners.couponCode,
      buttonText: banners.buttonText,
      validityText: banners.validityText,
      image: banners.image,
      href: banners.href,
      active: banners.active,
      createdAt: banners.createdAt,
    })
    .from(banners)
    .orderBy(desc(banners.createdAt))
    .$dynamic();

  if (onlyActive) {
    query = query.where(eq(banners.active, true));
  }

  const allBanners = await query;

  // Fetch only needed columns (code, validUntil) rather than full coupon records
  const allCoupons = await db
    .select({ code: coupons.code, validUntil: coupons.validUntil })
    .from(coupons);
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

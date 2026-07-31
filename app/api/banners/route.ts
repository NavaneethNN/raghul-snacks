import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { banners, coupons } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const allBanners = await db
      .select()
      .from(banners)
      .orderBy(desc(banners.createdAt));

    // Fetch all coupons in a single query to avoid N+1 problem
    const allCoupons = await db
      .select()
      .from(coupons);

    // Create a map for quick lookup
    const couponMap = new Map(allCoupons.map(c => [c.code, c]));

    // Add validity from associated coupons
    const bannersWithValidity = allBanners.map((banner) => {
      if (banner.couponCode) {
        const coupon = couponMap.get(banner.couponCode);
        if (coupon) {
          let validityText = "";
          if (coupon.validFrom && coupon.validUntil) {
            const fromDate = new Date(coupon.validFrom).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' });
            const untilDate = new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
            validityText = `Valid: ${fromDate} - ${untilDate}`;
          } else if (coupon.validUntil) {
            const untilDate = new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
            validityText = `Valid until: ${untilDate}`;
          }
          
          return {
            ...banner,
            validityText: validityText || banner.validityText,
          };
        }
      }
      return banner;
    });

    return NextResponse.json(bannersWithValidity);
  } catch (error) {
    console.error("Error fetching banners:", error);
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

const bannerSchema = z.object({
  eyebrow: z.string().default(""),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  offerText: z.string().optional(),
  couponCode: z.string().optional(),
  buttonText: z.string().default("Shop Now"),
  validityText: z.string().optional(),
  image: z.string().optional(),
  href: z.string().default("/shop"),
  active: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bannerSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid banner data" }, { status: 400 });
    }
    
    const db = getDb();
    const [banner] = await db
      .insert(banners)
      .values(parsed.data)
      .returning();
    
    return NextResponse.json(banner);
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}

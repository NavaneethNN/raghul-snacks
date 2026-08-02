import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { coupons } from "@/drizzle/schema";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    // Only expose active coupons here — this endpoint feeds the banner
    // editor's coupon picker (all active coupons), and, with ?public=1, the
    // checkout page's "available offers" list, which should only surface
    // coupons the admin marked as public rather than private/targeted codes.
    const publicOnly = new URL(request.url).searchParams.get("public") === "1";
    const allCoupons = await db
      .select()
      .from(coupons)
      .where(publicOnly ? and(eq(coupons.active, true), eq(coupons.publicCoupon, true)) : eq(coupons.active, true));
    return NextResponse.json({ coupons: allCoupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

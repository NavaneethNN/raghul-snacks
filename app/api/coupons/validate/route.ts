import { NextRequest, NextResponse } from "next/server";
import { coupons } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const db = getDb();
    const coupon = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code.toUpperCase()))
      .limit(1);

    if (!coupon || coupon.length === 0) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    const couponData = coupon[0];

    if (!couponData.active) {
      return NextResponse.json({ error: "This coupon is not active" }, { status: 400 });
    }

    return NextResponse.json({
      coupon: {
        code: couponData.code,
        discountType: couponData.discountType,
        value: couponData.value,
        active: couponData.active,
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}

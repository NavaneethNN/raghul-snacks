import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { coupons } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

// GET - Fetch all coupons
export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    const allCoupons = await db
      .select()
      .from(coupons)
      .orderBy(desc(coupons.createdAt));

    return NextResponse.json(allCoupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

// POST - Create new coupon
export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code, name, description, discountType, value, maxDiscount, minOrderValue, validFrom, validUntil, totalUsage, perCustomer, applicableProducts, applicableCategories, applyTo, firstPurchase, publicCoupon, notes, active } = body;

    if (!code || !discountType || (discountType !== "bogo" && !value)) {
      return NextResponse.json(
        { error: "Code, discount type, and value are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [newCoupon] = await db
      .insert(coupons)
      .values({
        code: code.toUpperCase(),
        name: name || null,
        description: description || null,
        discountType,
        value: discountType === "bogo" ? "0" : value.toString(),
        maxDiscount: maxDiscount ? maxDiscount.toString() : null,
        minOrderValue: minOrderValue ? minOrderValue.toString() : "0",
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        totalUsage: totalUsage ? parseInt(totalUsage) : null,
        perCustomer: perCustomer ? parseInt(perCustomer) : null,
        applicableProducts: applicableProducts && applicableProducts.length > 0 ? applicableProducts : null,
        applicableCategories: applicableCategories && applicableCategories.length > 0 ? applicableCategories : null,
        applyTo: applyTo || "entire_store",
        firstPurchase: firstPurchase || false,
        publicCoupon: publicCoupon !== undefined ? publicCoupon : true,
        notes: notes || null,
        active: active !== undefined ? active : true,
      })
      .returning();

    return NextResponse.json(newCoupon, { status: 201 });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}

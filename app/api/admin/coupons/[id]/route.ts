import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { coupons, banners } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH - Update coupon
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { code, name, description, discountType, value, maxDiscount, minOrderValue, validFrom, validUntil, totalUsage, perCustomer, applicableProducts, applicableCategories, applyTo, firstPurchase, publicCoupon, notes, active } = body;

    if (!code || !discountType || (discountType !== "bogo" && !value)) {
      return NextResponse.json(
        { error: "Code, discount type, and value are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
    const newCode = code.toUpperCase();

    await db
      .update(coupons)
      .set({
        code: newCode,
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
      .where(eq(coupons.id, id));

    // Banners link to coupons by code, not id, so a rename must be
    // cascaded or the banner would keep pointing at a code that no
    // longer exists.
    if (existing && existing.code !== newCode) {
      await db
        .update(banners)
        .set({ couponCode: newCode })
        .where(eq(banners.couponCode, existing.code));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

// DELETE - Delete coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const db = getDb();

    const [existing] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);

    await db.delete(coupons).where(eq(coupons.id, id));

    // Unlink any banners pointing at the deleted coupon so the storefront
    // doesn't keep advertising a code that no longer exists.
    if (existing) {
      await db
        .update(banners)
        .set({ couponCode: null })
        .where(eq(banners.couponCode, existing.code));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}

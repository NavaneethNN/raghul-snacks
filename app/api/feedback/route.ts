import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { products, reviews } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { normalizeIndianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      productId?: number | string;
      customerName?: string;
      phone?: string;
      rating?: number;
      content?: string;
    };

    const productId = Number(body.productId);
    const rating = Number(body.rating);
    const rawName = body.customerName?.trim();
    const rawPhone = body.phone?.trim();
    const content = body.content?.trim();

    if (!productId || isNaN(productId)) {
      return NextResponse.json({ error: "Please select a product." }, { status: 400 });
    }
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Please choose a rating between 1 and 5 stars." }, { status: 400 });
    }
    if (!rawName || rawName.length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!content || content.length < 3) {
      return NextResponse.json({ error: "Please share a few words about your experience." }, { status: 400 });
    }

    let cleanPhone: string | null = null;
    if (rawPhone) {
      cleanPhone = normalizeIndianPhone(rawPhone) || rawPhone;
    }

    const db = getDb();

    // Verify product exists and is active
    const product = (
      await db
        .select({ id: products.id, name: products.name, slug: products.slug })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1)
    )[0];

    if (!product) {
      return NextResponse.json({ error: "Selected product was not found." }, { status: 404 });
    }

    const [newReview] = await db
      .insert(reviews)
      .values({
        productId: product.id,
        customerName: rawName,
        phone: cleanPhone,
        rating,
        content,
        approved: true, // auto-approved; admin can hide or delete in /admin/reviews anytime
      })
      .returning();

    return NextResponse.json({
      success: true,
      reviewId: newReview.id,
      productName: product.name,
      productSlug: product.slug,
    });
  } catch (error) {
    console.error("Error creating feedback review:", error);
    return NextResponse.json({ error: "Failed to submit review. Please try again." }, { status: 500 });
  }
}


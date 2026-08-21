import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { banners } from "@/drizzle/schema";

export async function POST() {
  try {
    const db = getDb();
    
    const defaultBanners = [
      {
        eyebrow: "FESTIVE OFFER",
        title: "Flat 15% OFF",
        subtitle: "on all orders above ₹999",
        offerText: "Use Code:",
        couponCode: "FESTIVE15",
        buttonText: "Shop Now",
        validityText: "Valid till 31 Dec 2026",
        image: null,
        href: "/shop",
        active: true,
      },
      {
        eyebrow: "NEW ARRIVALS",
        title: "Fresh Millet Snacks",
        subtitle: "Handcrafted with love",
        offerText: "Handcrafted fresh for you",
        couponCode: null,
        buttonText: "Explore",
        validityText: "Limited time offer",
        image: null,
        href: "/shop",
        active: true,
      },
      {
        eyebrow: "COMBO DEAL",
        title: "Snack Box Special",
        subtitle: "Get 6 snacks for ₹499",
        offerText: "Save ₹200",
        couponCode: "COMBO200",
        buttonText: "Shop Combos",
        validityText: "While stocks last",
        image: null,
        href: "/shop?tab=combos",
        active: true,
      },
    ];

    const insertedBanners = await db
      .insert(banners)
      .values(defaultBanners)
      .returning();

    return NextResponse.json({ 
      message: "Default banners seeded successfully",
      count: insertedBanners.length,
      banners: insertedBanners
    });
  } catch (error) {
    console.error("Error seeding banners:", error);
    return NextResponse.json({ error: "Failed to seed banners" }, { status: 500 });
  }
}

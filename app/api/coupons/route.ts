import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { coupons } from "@/drizzle/schema";

export async function GET() {
  try {
    const db = getDb();
    const allCoupons = await db.select().from(coupons);
    return NextResponse.json({ coupons: allCoupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

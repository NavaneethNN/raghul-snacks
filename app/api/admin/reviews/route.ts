import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { reviews, products } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const rows = await db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      rating: reviews.rating,
      content: reviews.content,
      approved: reviews.approved,
      createdAt: reviews.createdAt,
      productId: reviews.productId,
      productName: products.name,
    })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt));

  return NextResponse.json(rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null })));
}

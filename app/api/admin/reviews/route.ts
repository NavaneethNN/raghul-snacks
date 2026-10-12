import { desc, eq, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { reviews, products } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = request.nextUrl.searchParams.get("pending");

  const db = getDb();
  const query = db
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
    .leftJoin(products, eq(reviews.productId, products.id));

  const rows = pending === "true"
    ? await query.where(eq(reviews.approved, false)).orderBy(desc(reviews.createdAt))
    : await query.orderBy(desc(reviews.createdAt));

  return NextResponse.json(rows.map((r) => ({ ...r, createdAt: r.createdAt?.toISOString() ?? null })));
}

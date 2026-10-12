import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { reviews } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/reviews/mine
// Returns the list of productIds the current user has already reviewed.
export async function GET() {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ reviewedProductIds: [] });

  const db = getDb();
  const rows = await db
    .select({ productId: reviews.productId })
    .from(reviews)
    .where(eq(reviews.accountId, session.id));

  const ids = rows
    .map((r) => r.productId)
    .filter((id): id is number => id !== null);

  return NextResponse.json({ reviewedProductIds: ids });
}

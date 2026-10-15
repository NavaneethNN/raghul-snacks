import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { orders } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/account/address
// Returns the most recently used delivery address for the logged-in user.
export async function GET() {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ address: null });

  const db = getDb();
  const [lastOrder] = await db
    .select({
      address: orders.address,
      city: orders.city,
      state: orders.state,
      pincode: orders.pincode,
    })
    .from(orders)
    .where(eq(orders.accountId, session.id))
    .orderBy(desc(orders.createdAt))
    .limit(1);

  if (!lastOrder) return NextResponse.json({ address: null });

  return NextResponse.json({ address: lastOrder });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { customers, orders } from "@/drizzle/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // Fetch customers with order count and total spent
    const customersData = await db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        email: customers.email,
        createdAt: customers.createdAt,
        orderCount: sql<number>`count(${orders.id})::int`,
        totalSpent: sql<string>`coalesce(sum(${orders.total}::numeric), 0)::text`,
      })
      .from(customers)
      .leftJoin(orders, sql`${customers.id} = ${orders.customerId}`)
      .groupBy(customers.id)
      .orderBy(sql`${customers.createdAt} DESC`);

    return NextResponse.json(customersData);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

import { and, eq, gte } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { orders } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

// Returns count of paid orders placed in the last 24 hours (new order indicator)
export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ newOrders: 0 });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newOrders = await getDb()
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.paymentStatus, "paid"), eq(orders.orderStatus, "placed"), gte(orders.createdAt, since)));

    return NextResponse.json({ newOrders: newOrders.length });
  } catch {
    return NextResponse.json({ newOrders: 0 });
  }
}

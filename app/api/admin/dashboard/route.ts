import { desc, count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { orders, products, customers } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = getDb();

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all aggregate counts and recent orders concurrently in parallel
    const [
      totalOrdersResult,
      totalProductsResult,
      totalCustomersResult,
      revenueResult,
      recentOrders,
    ] = await Promise.all([
      db.select({ count: count() }).from(orders),
      db.select({ count: count() }).from(products),
      db.select({ count: count() }).from(customers),
      db
        .select({ total: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
        .from(orders)
        .where(sql`${orders.createdAt} >= ${firstDayOfMonth} AND ${orders.paymentStatus} = 'paid'`),
      db
        .select({
          orderNumber: orders.orderNumber,
          customerName: orders.customerName,
          total: orders.total,
          orderStatus: orders.orderStatus,
          paymentStatus: orders.paymentStatus,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(5),
    ]);

    const totalOrders = totalOrdersResult[0]?.count || 0;
    const totalProducts = totalProductsResult[0]?.count || 0;
    const totalCustomers = totalCustomersResult[0]?.count || 0;
    const revenue = revenueResult[0]?.total || 0;

    return NextResponse.json({
      metrics: {
        totalOrders,
        totalProducts,
        totalCustomers,
        revenue: Number(revenue),
      },
      recentOrders: recentOrders.map((order) => ({
        ...order,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

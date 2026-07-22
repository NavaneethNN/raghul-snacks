import { desc, count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { orders, products, customers } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    // Get total orders count
    const totalOrdersResult = await db.select({ count: count() }).from(orders);
    const totalOrders = totalOrdersResult[0]?.count || 0;

    // Get total products count
    const totalProductsResult = await db.select({ count: count() }).from(products);
    const totalProducts = totalProductsResult[0]?.count || 0;

    // Get total customers count
    const totalCustomersResult = await db.select({ count: count() }).from(customers);
    const totalCustomers = totalCustomersResult[0]?.count || 0;

    // Get revenue for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const revenueResult = await db
      .select({ total: sql<number>`COALESCE(SUM(${orders.total}), 0)` })
      .from(orders)
      .where(sql`${orders.createdAt} >= ${firstDayOfMonth} AND ${orders.paymentStatus} = 'paid'`);
    
    const revenue = revenueResult[0]?.total || 0;

    // Get recent orders
    const recentOrders = await db
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
      .limit(5);

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

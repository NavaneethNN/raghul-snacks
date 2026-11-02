import { desc, count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { orders, products, customers, contactMessages } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getShiprocketWalletBalance } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    // Start of today in IST (UTC+5:30)
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now.getTime() + istOffset);
    const startOfTodayUtc = new Date(
      Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - istOffset
    );
    const firstDayOfMonthUtc = new Date(
      Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1) - istOffset
    );

    // Run consolidated aggregate queries and recent orders concurrently
    const [
      ordersAggResult,
      productsAggResult,
      totalCustomersResult,
      unreadMessagesResult,
      statusCountsResult,
      sourceCountsResult,
      recentOrders,
      walletResult,
    ] = await Promise.all([
      // 1. Consolidated orders financials, today's metrics, and month-to-date in one pass
      db
        .select({
          totalOrders: count(),
          totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
          totalCourier: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN CAST(COALESCE(${orders.shippingActual}, '0') AS NUMERIC) ELSE 0 END), 0)`,
          totalPlatform: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN CAST(COALESCE(${orders.shippingExtra}, '0') AS NUMERIC) ELSE 0 END), 0)`,
          revenueToday: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' AND ${orders.createdAt} >= ${startOfTodayUtc} THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
          ordersToday: sql<number>`COALESCE(SUM(CASE WHEN ${orders.createdAt} >= ${startOfTodayUtc} THEN 1 ELSE 0 END), 0)`,
          courierToday: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' AND ${orders.createdAt} >= ${startOfTodayUtc} THEN CAST(COALESCE(${orders.shippingActual}, '0') AS NUMERIC) ELSE 0 END), 0)`,
          platformToday: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' AND ${orders.createdAt} >= ${startOfTodayUtc} THEN CAST(COALESCE(${orders.shippingExtra}, '0') AS NUMERIC) ELSE 0 END), 0)`,
          revenueMonth: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' AND ${orders.createdAt} >= ${firstDayOfMonthUtc} THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
        })
        .from(orders),

      // 2. Products total & out of stock in one pass
      db
        .select({
          totalProducts: count(),
          outOfStock: sql<number>`COALESCE(SUM(CASE WHEN ${products.active} = false OR ${products.stock} = 0 THEN 1 ELSE 0 END), 0)`,
        })
        .from(products),

      // 3. Total customers
      db.select({ count: count() }).from(customers),

      // 4. Unread messages
      db
        .select({ count: count() })
        .from(contactMessages)
        .where(sql`${contactMessages.read} = false`),

      // 5. Status distribution
      db
        .select({
          status: orders.orderStatus,
          count: count(),
        })
        .from(orders)
        .groupBy(orders.orderStatus),

      // 6. Source / Channel distribution
      db
        .select({
          source: sql<string>`COALESCE(${orders.orderSource}, 'website')`,
          count: count(),
          revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN CAST(${orders.total} AS NUMERIC) ELSE 0 END), 0)`,
        })
        .from(orders)
        .groupBy(sql`COALESCE(${orders.orderSource}, 'website')`),

      // 7. Recent 8 orders
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          customerName: orders.customerName,
          city: orders.city,
          total: orders.total,
          orderStatus: orders.orderStatus,
          paymentStatus: orders.paymentStatus,
          paymentMethod: orders.paymentMethod,
          orderSource: orders.orderSource,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(8),

      // 8. Shiprocket live wallet balance (cached in-memory for 60s)
      getShiprocketWalletBalance().catch(() => ({ configured: false, balance: 0, currency: "INR" })),
    ]);

    const ordAgg = ordersAggResult[0];
    const totalOrders = Number(ordAgg?.totalOrders || 0);
    const totalRevenue = Number(ordAgg?.totalRevenue || 0);
    const totalCourier = Number(ordAgg?.totalCourier || 0);
    const totalPlatform = Number(ordAgg?.totalPlatform || 0);
    const productRevenue = Math.max(0, totalRevenue - totalCourier - totalPlatform);

    const revenueToday = Number(ordAgg?.revenueToday || 0);
    const ordersToday = Number(ordAgg?.ordersToday || 0);
    const courierChargesToday = Number(ordAgg?.courierToday || 0);
    const platformFeeToday = Number(ordAgg?.platformToday || 0);
    const productRevenueToday = Math.max(0, revenueToday - courierChargesToday - platformFeeToday);
    const revenueMonth = Number(ordAgg?.revenueMonth || 0);

    const prodAgg = productsAggResult[0];
    const totalProducts = Number(prodAgg?.totalProducts || 0);
    const outOfStockProducts = Number(prodAgg?.outOfStock || 0);

    const totalCustomers = Number(totalCustomersResult[0]?.count || 0);
    const unreadMessages = Number(unreadMessagesResult[0]?.count || 0);

    const statusCounts: Record<string, number> = {
      placed: 0,
      packed: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const row of statusCountsResult) {
      if (row.status) {
        statusCounts[row.status] = Number(row.count) || 0;
      }
    }

    const sourceBreakdown: Record<string, { count: number; revenue: number }> = {
      website: { count: 0, revenue: 0 },
      whatsapp: { count: 0, revenue: 0 },
      instagram: { count: 0, revenue: 0 },
      offline: { count: 0, revenue: 0 },
    };
    for (const row of sourceCountsResult) {
      const key = (row.source || "website").toLowerCase();
      if (!sourceBreakdown[key]) {
        sourceBreakdown[key] = { count: 0, revenue: 0 };
      }
      sourceBreakdown[key].count = Number(row.count) || 0;
      sourceBreakdown[key].revenue = Number(row.revenue) || 0;
    }

    return NextResponse.json({
      metrics: {
        totalOrders,
        totalProducts,
        totalCustomers,
        revenueToday,
        ordersToday,
        revenueMonth,
        totalRevenue,
        productRevenue,
        courierCharges: totalCourier,
        platformFee: totalPlatform,
        courierChargesToday,
        platformFeeToday,
        productRevenueToday,
        outOfStockCount: outOfStockProducts,
        unreadMessagesCount: unreadMessages,
      },
      statusPipeline: {
        placed: statusCounts.placed || 0,
        packed: statusCounts.packed || 0,
        dispatched: statusCounts.dispatched || 0,
        delivered: statusCounts.delivered || 0,
        cancelled: statusCounts.cancelled || 0,
        needsAttention: (statusCounts.placed || 0) + (statusCounts.packed || 0),
      },
      sourceBreakdown,
      wallet: walletResult,
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        city: order.city || "",
        total: Number(order.total),
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || "online",
        orderSource: order.orderSource || "website",
        createdAt: order.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

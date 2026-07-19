import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { orders } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { AdminOrders } from "@/components/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  try {
    const recentOrders = await getDb().select({ id: orders.id, orderNumber: orders.orderNumber, customerName: orders.customerName, phone: orders.phone, address: orders.address, total: orders.total, paymentStatus: orders.paymentStatus, orderStatus: orders.orderStatus, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(100);
    return <section className="admin-page"><p className="eyebrow">Operations</p><h1>Orders.</h1><AdminOrders orders={recentOrders.map((order) => ({ ...order, total: Number(order.total), createdAt: order.createdAt.toISOString() }))} /></section>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load orders.";
    return <section className="empty-state"><p className="eyebrow">Admin</p><h1>Orders are not ready.</h1><p>{message}</p></section>;
  }
}

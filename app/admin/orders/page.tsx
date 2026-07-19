import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { orders } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { AdminOrders } from "@/components/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  try {
    const recentOrders = await getDb().select({ id: orders.id, orderNumber: orders.orderNumber, customerName: orders.customerName, phone: orders.phone, email: orders.email, address: orders.address, city: orders.city, state: orders.state, pincode: orders.pincode, total: orders.total, paymentStatus: orders.paymentStatus, orderStatus: orders.orderStatus, shippingStatus: orders.shippingStatus, shipmentId: orders.shipmentId, awbCode: orders.awbCode, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(100);
    return <AdminOrders orders={recentOrders.map((order) => ({ ...order, total: Number(order.total), createdAt: order.createdAt.toISOString() }))} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load orders.";
    return <section style={{ padding: "48px", textAlign: "center" }}><p style={{ color: "var(--terracotta)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", marginBottom: "12px" }}>Admin</p><h1 style={{ fontSize: "32px", marginBottom: "12px" }}>Orders are not ready.</h1><p style={{ color: "#6b7280" }}>{message}</p></section>;
  }
}

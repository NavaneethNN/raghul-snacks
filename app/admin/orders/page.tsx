import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { orders, orderItems } from "@/drizzle/schema";
import { adminCookieName, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { AdminOrders } from "@/components/admin-orders";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  try {
    if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) redirect("/admin/login");
  } catch { redirect("/admin/login"); }

  type OrderWithItems = {
    id: number;
    orderNumber: string;
    customerName: string;
    phone: string;
    email: string | null;
    address: string;
    city: string;
    state: string;
    pincode: string;
    total: number;
    paymentStatus: string;
    paymentMethod: string | null;
    orderStatus: string;
    shippingStatus: string;
    shipmentId: string | null;
    awbCode: string | null;
    createdAt: string;
    items: { id: number; name: string; quantity: number; price: number }[];
  };

  let ordersWithItems: OrderWithItems[] = [];
  try {
    const db = getDb();

    const recentOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        phone: orders.phone,
        email: orders.email,
        address: orders.address,
        city: orders.city,
        state: orders.state,
        pincode: orders.pincode,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        orderStatus: orders.orderStatus,
        shippingStatus: orders.shippingStatus,
        shipmentId: orders.shipmentId,
        awbCode: orders.awbCode,
        createdAt: orders.createdAt
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(100);

    ordersWithItems = await Promise.all(
      recentOrders.map(async (order) => {
        const items = await db
          .select({
            id: orderItems.id,
            name: orderItems.name,
            quantity: orderItems.quantity,
            price: orderItems.price
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        return {
          ...order,
          total: Number(order.total),
          createdAt: order.createdAt.toISOString(),
          items: items.map(item => ({
            ...item,
            price: Number(item.price)
          }))
        };
      })
    );
  } catch (error) {
    console.error("Error loading orders:", error);
  }

  return <AdminOrders orders={ordersWithItems} />;
}

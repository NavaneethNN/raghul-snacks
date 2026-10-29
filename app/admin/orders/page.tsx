import { desc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { orders, orderItems, productVariants, products } from "@/drizzle/schema";
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
    items: {
      id: number;
      name: string;
      quantity: number;
      price: number;
      weight?: string | null;
      productId?: number | null;
      variantId?: number | null;
    }[];
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

    const orderIds = recentOrders.map((o) => o.id);
    const allItems = orderIds.length > 0
      ? await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            productId: orderItems.productId,
            variantId: orderItems.variantId,
            name: orderItems.name,
            quantity: orderItems.quantity,
            price: orderItems.price,
            weight: orderItems.weight,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    // Fallbacks: if weight is missing from order_items, look up variant or product weight
    const missingVariantIds = [
      ...new Set(
        allItems
          .filter((i) => (!i.weight || i.weight.trim() === "") && i.variantId)
          .map((i) => i.variantId as number)
      ),
    ];
    const missingProductIds = [
      ...new Set(
        allItems
          .filter((i) => (!i.weight || i.weight.trim() === "") && !i.variantId && i.productId)
          .map((i) => i.productId as number)
      ),
    ];

    const variantWeightMap = new Map<number, string>();
    if (missingVariantIds.length > 0) {
      const vRows = await db
        .select({ id: productVariants.id, weight: productVariants.weight })
        .from(productVariants)
        .where(inArray(productVariants.id, missingVariantIds));
      for (const v of vRows) {
        if (v.weight) variantWeightMap.set(v.id, v.weight);
      }
    }

    const productWeightMap = new Map<number, string>();
    if (missingProductIds.length > 0) {
      const pRows = await db
        .select({ id: products.id, weight: products.weight })
        .from(products)
        .where(inArray(products.id, missingProductIds));
      for (const p of pRows) {
        if (p.weight) productWeightMap.set(p.id, p.weight);
      }
    }

    const itemsByOrderId = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrderId.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrderId.set(item.orderId, list);
    }

    ordersWithItems = recentOrders.map((order) => {
      const items = itemsByOrderId.get(order.id) ?? [];
      return {
        ...order,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: items.map((item) => {
          const resolvedWeight =
            item.weight && item.weight.trim() !== ""
              ? item.weight
              : (item.variantId ? variantWeightMap.get(item.variantId) : null) ||
                (item.productId ? productWeightMap.get(item.productId) : null) ||
                null;
          return {
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            name: item.name,
            quantity: item.quantity,
            price: Number(item.price),
            weight: resolvedWeight,
          };
        }),
      };
    });
  } catch (error) {
    console.error("Error loading orders:", error);
  }

  return <AdminOrders orders={ordersWithItems} />;
}

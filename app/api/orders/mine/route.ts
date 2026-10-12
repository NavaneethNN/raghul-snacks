import { desc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { orders, orderItems, products } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    if (!session) return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });

    const db = getDb();

    const customerOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        customerName: orders.customerName,
        city: orders.city,
        state: orders.state,
        pincode: orders.pincode,
        total: orders.total,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        shippingStatus: orders.shippingStatus,
        awbCode: orders.awbCode,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.accountId, session.id))
      .orderBy(desc(orders.createdAt));

    const orderIds = customerOrders.map((o) => o.id);

    const allItems =
      orderIds.length > 0
        ? await db
            .select({
              id: orderItems.id,
              orderId: orderItems.orderId,
              productId: orderItems.productId,
              name: orderItems.name,
              quantity: orderItems.quantity,
              price: orderItems.price,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : [];

    const productIds = [
      ...new Set(allItems.map((i) => i.productId).filter((id): id is number => id !== null)),
    ];

    const allProductRows =
      productIds.length > 0
        ? await db
            .select({
              id: products.id,
              name: products.name,
              slug: products.slug,
              image: products.image,
              price: products.price,
              offerPrice: products.offerPrice,
              weight: products.weight,
            })
            .from(products)
            .where(inArray(products.id, productIds))
        : [];

    const productById = new Map(allProductRows.map((p) => [p.id, p]));

    const itemsByOrderId = new Map<number, typeof allItems>(orderIds.map((id) => [id, []]));
    for (const item of allItems) {
      itemsByOrderId.get(item.orderId)?.push(item);
    }

    const result = customerOrders.map((order) => {
      const items = itemsByOrderId.get(order.id) ?? [];
      return {
        ...order,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        items: items.map((item) => {
          const p =
            item.productId != null
              ? (productById.get(item.productId) ?? null)
              : (allProductRows.find((pr) => pr.name === item.name) ?? null);
          return {
            id: item.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: String(item.price),
            product: p
              ? {
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  image: p.image,
                  price: String(p.price),
                  offerPrice: p.offerPrice != null ? String(p.offerPrice) : null,
                  weight: p.weight,
                }
              : null,
          };
        }),
      };
    });

    return NextResponse.json({ orders: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load your orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

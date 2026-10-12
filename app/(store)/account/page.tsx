import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { customerAccounts, orders, orderItems, products } from "@/drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { AccountDashboard } from "@/components/account-dashboard";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(customerCookieName());

  if (!sessionCookie?.value) {
    redirect("/login?returnTo=/account");
  }

  // Parse the session token
  const session = getCustomerSession(sessionCookie.value);

  if (!session || !session.id) {
    redirect("/login?returnTo=/account");
  }

  const db = getDb();

  // Fetch customer account details using session ID
  const account = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.id, session.id))
    .limit(1);

  if (!account || account.length === 0) {
    redirect("/login?returnTo=/account");
  }

  const accountData = account[0];

  // Fetch customer orders - use email to match since accountId might be null in some orders
  const customerOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      discount: orders.discount,
      couponCode: orders.couponCode,
      paymentStatus: orders.paymentStatus,
      orderStatus: orders.orderStatus,
      paymentMethod: orders.paymentMethod,
      shippingStatus: orders.shippingStatus,
      awbCode: orders.awbCode,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.email, accountData.email))
    .orderBy(desc(orders.createdAt));

  // Batch-fetch all order items and products — no N+1 queries
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

  const productIds = [...new Set(allItems.map((i) => i.productId).filter((id): id is number => id !== null))];

  const allProductRows =
    productIds.length > 0
      ? await db.select().from(products).where(inArray(products.id, productIds))
      : [];

  // Build look-up maps
  const productById = new Map(allProductRows.map((p) => [p.id, p]));

  // For items whose productId is null, match by name (in memory — no extra DB round-trip)
  const itemsByOrderId = new Map<number, typeof allItems>(orderIds.map((id) => [id, []]));
  for (const item of allItems) {
    itemsByOrderId.get(item.orderId)?.push(item);
  }

  const ordersWithItems = customerOrders.map((order) => {
    const items = itemsByOrderId.get(order.id) ?? [];
    const itemsWithProducts = items.map((item) => {
      const p =
        item.productId != null
          ? (productById.get(item.productId) ?? null)
          : (allProductRows.find((pr) => pr.name === item.name) ?? null);

      return {
        id: item.id,
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        product: p
          ? {
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description,
              ingredients: p.ingredients,
              price: p.price,
              offerPrice: p.offerPrice,
              weight: p.weight,
              categoryId: p.categoryId,
              image: p.image,
              stock: p.stock,
              featured: p.featured,
              bestseller: p.bestseller,
            }
          : null,
      };
    });

    return {
      ...order,
      total: String(order.total),
      discount: String(order.discount),
      couponCode: order.couponCode ?? null,
      createdAt: order.createdAt.toISOString(),
      items: itemsWithProducts,
    };
  });

  return (
    <AccountDashboard
      account={{
        name: accountData.name,
        email: accountData.email,
        createdAt: accountData.createdAt,
      }}
      orders={ordersWithItems}
    />
  );
}

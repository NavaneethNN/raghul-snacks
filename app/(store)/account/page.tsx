import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { customerAccounts, orders, orderItems, products } from "@/drizzle/schema";
import { eq, desc } from "drizzle-orm";
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
      shippingStatus: orders.shippingStatus,
      awbCode: orders.awbCode,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.email, accountData.email))
    .orderBy(desc(orders.createdAt));

  // Fetch order items for each order with product information
  const ordersWithItems = await Promise.all(
    customerOrders.map(async (order) => {
      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          name: orderItems.name,
          quantity: orderItems.quantity,
          price: orderItems.price,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      // Fetch product details for each item.
      // product_id is null on older orders — fall back to matching by name.
      const itemsWithProducts = await Promise.all(
        items.map(async (item) => {
          const lookupById = item.productId
            ? await db.select().from(products).where(eq(products.id, item.productId)).limit(1)
            : [];

          const lookupByName = lookupById.length === 0
            ? await db.select().from(products).where(eq(products.name, item.name)).limit(1)
            : [];

          const p = lookupById[0] ?? lookupByName[0] ?? null;

          return {
            ...item,
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
        })
      );

    return {
        ...order,
        total: String(order.total),
        discount: String(order.discount),
        couponCode: order.couponCode ?? null,
        createdAt: order.createdAt.toISOString(),
        items: itemsWithProducts,
      };
    })
  );

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

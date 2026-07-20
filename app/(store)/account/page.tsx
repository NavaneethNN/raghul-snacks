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

  if (!session) {
    redirect("/login?returnTo=/account");
  }

  const db = getDb();

  // Fetch customer account details using session ID
  const [account] = await db
    .select()
    .from(customerAccounts)
    .where(eq(customerAccounts.id, session.id));

  if (!account) {
    redirect("/login?returnTo=/account");
  }

  // Fetch customer orders
  const customerOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.accountId, account.id))
    .orderBy(desc(orders.createdAt));

  // Fetch order items for each order
  const ordersWithItems = await Promise.all(
    customerOrders.map(async (order) => {
      const items = await db
        .select({
          id: orderItems.id,
          name: orderItems.name,
          quantity: orderItems.quantity,
          price: orderItems.price,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      return { ...order, items };
    })
  );

  return (
    <AccountDashboard
      account={{
        name: account.name,
        email: account.email,
        createdAt: account.createdAt,
      }}
      orders={ordersWithItems}
    />
  );
}

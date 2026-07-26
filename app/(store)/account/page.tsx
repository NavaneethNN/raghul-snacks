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
    .select()
    .from(orders)
    .where(eq(orders.email, accountData.email))
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
        name: accountData.name,
        email: accountData.email,
        createdAt: accountData.createdAt,
      }}
      orders={ordersWithItems}
    />
  );
}

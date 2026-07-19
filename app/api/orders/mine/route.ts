import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { orders } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    if (!session) return NextResponse.json({ error: "Sign in to view your orders." }, { status: 401 });
    const customerOrders = await getDb().select({ orderNumber: orders.orderNumber, customerName: orders.customerName, city: orders.city, state: orders.state, pincode: orders.pincode, total: orders.total, orderStatus: orders.orderStatus, paymentStatus: orders.paymentStatus, shippingStatus: orders.shippingStatus, awbCode: orders.awbCode, createdAt: orders.createdAt }).from(orders).where(eq(orders.accountId, session.id)).orderBy(desc(orders.createdAt));
    return NextResponse.json({ orders: customerOrders.map((order) => ({ ...order, total: Number(order.total), createdAt: order.createdAt.toISOString() })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load your orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

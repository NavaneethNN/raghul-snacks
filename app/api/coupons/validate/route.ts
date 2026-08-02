import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { customerAccounts } from "@/drizzle/schema";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { validateCoupon } from "@/lib/coupons";
import { getDb } from "@/lib/db";
import { orderItemSchema } from "@/lib/order-input";
import { priceOrder } from "@/lib/order-pricing";
import { eq } from "drizzle-orm";

const inputSchema = z.object({ code: z.string().trim().min(1), items: z.array(orderItemSchema).min(1) });

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "A coupon code and your cart items are required." }, { status: 400 });

  try {
    const { lines, subtotal } = await priceOrder(input.data.items);

    const cookieStore = await cookies();
    const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
    let customerEmail: string | undefined;
    if (session) {
      const account = (await getDb().select({ email: customerAccounts.email }).from(customerAccounts).where(eq(customerAccounts.id, session.id)).limit(1))[0];
      customerEmail = account?.email;
    }

    const result = await validateCoupon(input.data.code, subtotal, lines, customerEmail);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({
      coupon: {
        code: result.coupon.code,
        name: result.coupon.name,
        discountType: result.coupon.discountType,
        value: result.coupon.value,
      },
      discountAmount: result.discountAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to validate coupon.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

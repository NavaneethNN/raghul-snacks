import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { customerAccounts } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName, getCustomerSession } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

const inputSchema = z.object({ name: z.string().trim().min(2, "Name must be at least 2 characters long.").max(100) });

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const session = getCustomerSession(cookieStore.get(customerCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Please sign in to update your account." }, { status: 401 });

  const input = inputSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: input.error.issues[0]?.message || "Enter a valid name." }, { status: 400 });

  try {
    const db = getDb();
    const [account] = await db
      .update(customerAccounts)
      .set({ name: input.data.name })
      .where(eq(customerAccounts.id, session.id))
      .returning({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email });

    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const response = NextResponse.json({ account: { name: account.name, email: account.email } });
    response.cookies.set(customerCookieName(), createCustomerSession(account), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update your account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

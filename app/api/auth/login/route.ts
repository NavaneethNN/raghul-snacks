import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { customerAccounts } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName, verifyPassword } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

const inputSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  try {
    const account = (await getDb().select({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email, passwordHash: customerAccounts.passwordHash }).from(customerAccounts).where(eq(customerAccounts.email, input.data.email.toLowerCase())).limit(1))[0];
    if (!account || !(await verifyPassword(input.data.password, account.passwordHash))) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

    // Create session with account ID, name, and email
    const sessionData = { id: account.id, name: account.name, email: account.email };
    const sessionToken = createCustomerSession(sessionData);

    const response = NextResponse.json({ account: { name: account.name, email: account.email } });
    response.cookies.set(customerCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    console.log("Login successful for:", account.email, "Session created with ID:", account.id);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

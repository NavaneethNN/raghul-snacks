import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { customerAccounts } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName, hashPassword } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

const inputSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  const input = inputSchema.safeParse(await request.json());
  if (!input.success) return NextResponse.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
  try {
    const db = getDb();
    const email = input.data.email.toLowerCase();
    const existing = await db.select({ id: customerAccounts.id }).from(customerAccounts).where(eq(customerAccounts.email, email)).limit(1);
    if (existing[0]) return NextResponse.json({ error: "An account already exists for this email. Please log in." }, { status: 409 });
    const [account] = await db.insert(customerAccounts).values({ name: input.data.name, email, passwordHash: await hashPassword(input.data.password) }).returning({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email });
    const response = NextResponse.json({ account: { name: account.name, email: account.email } }, { status: 201 });
    response.cookies.set(customerCookieName(), createCustomerSession(account), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create your account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

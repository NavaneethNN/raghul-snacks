import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { customerAccounts } from "@/drizzle/schema";
import { getCustomerSession, customerCookieName } from "@/lib/customer-auth";
import { adminCookieName, createAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(customerCookieName())?.value;
  const session = getCustomerSession(sessionToken);

  if (!session || !session.id) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    const db = getDb();
    const account = (
      await db
        .select({ id: customerAccounts.id, isAdmin: customerAccounts.isAdmin })
        .from(customerAccounts)
        .where(and(eq(customerAccounts.id, session.id), eq(customerAccounts.isAdmin, true)))
        .limit(1)
    )[0];

    if (!account || !account.isAdmin) {
      return NextResponse.redirect(new URL("/account?error=unauthorized", request.url));
    }

    const response = NextResponse.redirect(new URL("/admin", request.url));
    response.cookies.set(adminCookieName(), createAdminSession(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[admin/bridge] Error validating admin session:", err);
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

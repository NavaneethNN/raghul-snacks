import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { customerCookieName, getCustomerSession } from "@/lib/customer-auth";

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({ account: getCustomerSession(cookieStore.get(customerCookieName())?.value) });
}

export async function DELETE() {
  const response = NextResponse.json({ account: null });
  response.cookies.set(customerCookieName(), "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}

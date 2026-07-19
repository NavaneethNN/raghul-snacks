import { NextResponse } from "next/server";
import { z } from "zod";
import { adminCookieName, createAdminSession, isValidAdminPassword } from "@/lib/admin-auth";

const bodySchema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Password is required." }, { status: 400 });
  try {
    if (!isValidAdminPassword(body.data.password)) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(adminCookieName(), createAdminSession(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(adminCookieName(), "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}

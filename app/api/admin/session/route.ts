import { NextResponse } from "next/server";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { settings } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { adminCookieName, createAdminSession, isValidAdminPassword } from "@/lib/admin-auth";

const bodySchema = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  const body = bodySchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Password is required." }, { status: 400 });
  try {
    let dbSetting: Array<{ value: string }> = [];
    try {
      const db = getDb();
      dbSetting = await db
        .select({ value: settings.value })
        .from(settings)
        .where(eq(settings.key, "adminPassword"))
        .limit(1);
    } catch (dbErr) {
      console.warn(
        "[admin-session] Database query failed (e.g. quota/network), falling back to ADMIN_PASSWORD env var:",
        dbErr instanceof Error ? dbErr.message : dbErr
      );
    }

    let valid = false;
    if (dbSetting.length > 0 && dbSetting[0].value) {
      const storedPw = dbSetting[0].value;
      valid = storedPw.length === body.data.password.length &&
        timingSafeEqual(Buffer.from(storedPw), Buffer.from(body.data.password));
    } else {
      valid = isValidAdminPassword(body.data.password);
    }

    if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
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

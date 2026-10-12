import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { settings } from "@/drizzle/schema";
import { adminCookieName, createAdminSession, isValidAdminPassword, isValidAdminSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isValidAdminSession(cookieStore.get(adminCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json() as { oldPassword?: string; newPassword?: string; keepLoggedIn?: boolean };
  const { oldPassword, newPassword, keepLoggedIn } = body;

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Old and new passwords are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  // Verify old password against current password (DB setting first, then env var)
  const db = getDb();
  const dbSetting = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, "adminPassword"))
    .limit(1);

  let oldIsValid = false;
  if (dbSetting.length > 0) {
    // Compare against DB-stored password
    const storedPw = dbSetting[0].value;
    oldIsValid = storedPw.length === oldPassword.length &&
      Buffer.from(storedPw).equals(Buffer.from(oldPassword));
  } else {
    // Fall back to env var
    oldIsValid = isValidAdminPassword(oldPassword);
  }

  if (!oldIsValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  // Save new password to DB settings
  if (dbSetting.length > 0) {
    await db.update(settings).set({ value: newPassword }).where(eq(settings.key, "adminPassword"));
  } else {
    await db.insert(settings).values({
      key: "adminPassword",
      value: newPassword,
      description: "Admin panel password (overrides ADMIN_PASSWORD env var)",
    });
  }

  const response = NextResponse.json({ success: true });

  if (keepLoggedIn) {
    // Refresh session cookie
    response.cookies.set(adminCookieName(), createAdminSession(), {
      httpOnly: true, sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 12,
    });
  } else {
    // Clear session — force re-login
    response.cookies.set(adminCookieName(), "", {
      httpOnly: true, sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 0,
    });
  }

  return response;
}

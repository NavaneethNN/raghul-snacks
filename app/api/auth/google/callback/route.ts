import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName } from "@/lib/customer-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type GoogleProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const returnTo = searchParams.get("state") || "/account";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  function loginError(reason: string) {
    const dest = new URL("/login", appUrl);
    dest.searchParams.set("error", reason);
    return NextResponse.redirect(dest);
  }

  if (searchParams.get("error") || !code) return loginError("google_denied");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError("google_not_configured");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return loginError("google_failed");
    const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) return loginError("google_failed");
    const profile = (await profileResponse.json()) as GoogleProfile;
    if (!profile.email || profile.email_verified === false) return loginError("google_no_email");

    const db = getDb();
    const email = profile.email.toLowerCase();
    const name = profile.name?.trim() || email.split("@")[0];

    let account = (
      await db
        .select({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email })
        .from(customerAccounts)
        .where(eq(customerAccounts.email, email))
        .limit(1)
    )[0];

    if (!account) {
      [account] = await db
        .insert(customerAccounts)
        .values({ name, email, googleId: profile.sub })
        .returning({ id: customerAccounts.id, name: customerAccounts.name, email: customerAccounts.email });
    } else {
      // Link this Google identity to the existing account (e.g. one created via email/password).
      await db.update(customerAccounts).set({ googleId: profile.sub }).where(eq(customerAccounts.id, account.id));
    }

    const response = NextResponse.redirect(new URL(returnTo, appUrl));
    response.cookies.set(customerCookieName(), createCustomerSession(account), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return loginError("google_failed");
  }
}

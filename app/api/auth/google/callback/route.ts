import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { customerAccounts } from "@/drizzle/schema";
import { createCustomerSession, customerCookieName } from "@/lib/customer-auth";
import { adminCookieName, createAdminSession } from "@/lib/admin-auth";
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
  const rawState = searchParams.get("state");

  let safeReturnTo = "/account";
  let isPopup = false;

  if (rawState) {
    try {
      if (rawState.startsWith("/")) {
        safeReturnTo = rawState;
      } else {
        const parsed = JSON.parse(Buffer.from(rawState, "base64url").toString("utf-8"));
        if (
          parsed.returnTo &&
          typeof parsed.returnTo === "string" &&
          parsed.returnTo.startsWith("/") &&
          !parsed.returnTo.includes("://")
        ) {
          safeReturnTo = parsed.returnTo;
        }
        isPopup = Boolean(parsed.isPopup);
      }
    } catch {
      safeReturnTo = "/account";
    }
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  function loginError(reason: string) {
    if (isPopup) {
      const errorHtml = `<!DOCTYPE html>
<html>
<head><title>Sign in Error</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#faf8f5;">
  <p style="font-size:14px;color:#dc2626;">Signing in was cancelled or failed. Closing window…</p>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: ${JSON.stringify(reason)} }, window.location.origin);
        setTimeout(function() { window.close(); }, 200);
      } else {
        window.location.replace("/login?error=" + encodeURIComponent(${JSON.stringify(reason)}));
      }
    } catch (e) {
      window.location.replace("/login?error=" + encodeURIComponent(${JSON.stringify(reason)}));
    }
  </script>
</body>
</html>`;
      return new NextResponse(errorHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

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
        .select({
          id: customerAccounts.id,
          name: customerAccounts.name,
          email: customerAccounts.email,
          isAdmin: customerAccounts.isAdmin,
        })
        .from(customerAccounts)
        .where(eq(customerAccounts.email, email))
        .limit(1)
    )[0];

    if (!account) {
      [account] = await db
        .insert(customerAccounts)
        .values({ name, email, googleId: profile.sub })
        .returning({
          id: customerAccounts.id,
          name: customerAccounts.name,
          email: customerAccounts.email,
          isAdmin: customerAccounts.isAdmin,
        });
    } else {
      // Link this Google identity to the existing account
      await db.update(customerAccounts).set({ googleId: profile.sub }).where(eq(customerAccounts.id, account.id));
    }

    const sessionData = {
      id: account.id,
      name: account.name,
      email: account.email,
      isAdmin: Boolean(account.isAdmin),
    };

    // Return HTML that communicates with opener (popup) or replaces current page (direct redirect)
    // This completely prevents Google consent screen or callback URL from staying in the browser history!
    const successHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signed in successfully</title>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#faf8f5;">
  <div style="text-align:center;padding:24px;">
    <div style="width:36px;height:36px;border:3px solid #e5e0d8;border-top-color:#c95f3b;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 16px;"></div>
    <p style="font-size:16px;color:#1c1917;font-weight:600;margin:0 0 6px;">Signed in successfully</p>
    <p style="font-size:13px;color:#6b7280;margin:0;">Redirecting to your account…</p>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', returnTo: ${JSON.stringify(safeReturnTo)} }, window.location.origin);
        setTimeout(function() { window.close(); }, 120);
      } else {
        window.location.replace(${JSON.stringify(safeReturnTo)});
      }
    } catch (err) {
      window.location.replace(${JSON.stringify(safeReturnTo)});
    }
  </script>
</body>
</html>`;

    const response = new NextResponse(successHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    response.cookies.set(customerCookieName(), createCustomerSession(sessionData), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    if (account.isAdmin) {
      response.cookies.set(adminCookieName(), createAdminSession(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return loginError("google_failed");
  }
}

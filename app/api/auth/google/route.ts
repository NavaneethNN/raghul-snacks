import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/account";
  const isPopup = searchParams.get("popup") === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    if (isPopup) {
      const html = `<!DOCTYPE html><html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: "google_not_configured" }, window.location.origin);
          window.close();
        } else {
          window.location.replace("/login?error=google_not_configured");
        }
      </script></body></html>`;
      return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html" } });
    }
    const dest = new URL("/login", appUrl);
    dest.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(dest);
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", `${appUrl}/api/auth/google/callback`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  // Pass returnTo and isPopup encoded in state so callback knows how to reply
  const statePayload = JSON.stringify({ returnTo, isPopup });
  const state = Buffer.from(statePayload).toString("base64url");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

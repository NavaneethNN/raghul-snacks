import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "raghul_admin_session";

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function verifyAdminCookie(value: string): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const [payload, signature] = value.split(".");
  if (payload !== "admin" || !signature) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(signature),
      enc.encode(payload)
    );
    return valid;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Always allow the login page through
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieValue || !(await verifyAdminCookie(cookieValue))) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

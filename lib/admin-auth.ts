import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "raghul_admin_session";

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is required for admin access.");
  return secret;
}

export function adminCookieName() { return cookieName; }

export function createAdminSession() {
  const payload = "admin";
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function isValidAdminSession(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (payload !== "admin" || !signature) return false;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function isValidAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD;
  if (!configured) throw new Error("ADMIN_PASSWORD is required for admin access.");
  return configured.length === password.length && timingSafeEqual(Buffer.from(configured), Buffer.from(password));
}

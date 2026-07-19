import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const cookieName = "raghul_customer_session";
type CustomerSession = { id: number; email: string; name: string };

function sessionSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) throw new Error("CUSTOMER_SESSION_SECRET is required for customer accounts.");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = Buffer.from(await scrypt(password, salt, 64) as ArrayBuffer).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = Buffer.from(await scrypt(password, salt, 64) as ArrayBuffer).toString("hex");
  return candidate.length === hash.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

export function customerCookieName() { return cookieName; }

export function createCustomerSession(account: CustomerSession) {
  const payload = Buffer.from(JSON.stringify(account)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getCustomerSession(value?: string): CustomerSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const account = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CustomerSession;
    return Number.isInteger(account.id) && typeof account.email === "string" && typeof account.name === "string" ? account : null;
  } catch { return null; }
}

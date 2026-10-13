import { createHmac } from "crypto";

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  created_at: number;
}

function getCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured.");
  return { keyId, keySecret };
}

export async function createRazorpayOrder(
  amount: number,
  orderId: string
): Promise<RazorpayOrder> {
  const { keyId, keySecret } = getCredentials();
  const amountPaise = Math.round(amount * 100);
  if (amountPaise < 100) throw new Error("Order amount must be at least ₹1.");
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: orderId,
    }),
  });
  const data = (await res.json()) as RazorpayOrder & { error?: { description?: string } };
  if (!res.ok) throw new Error(data.error?.description ?? "Razorpay order creation failed.");
  return data;
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const { keySecret } = getCredentials();
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = createHmac("sha256", keySecret).update(body).digest("hex");
  return expected === signature;
}

export function getRazorpayKeyId(): string {
  const { keyId } = getCredentials();
  return keyId;
}

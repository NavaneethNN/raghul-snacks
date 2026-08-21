type CashfreeOrder = {
  order_id?: string;
  order_amount?: number | string;
  order_status?: string;
  payment_session_id?: string;
  order_tags?: Record<string, string>;
  message?: string;
};

type CashfreePayment = {
  payment_status?: string;
  payment_method?: Record<string, unknown>;
  message?: string;
};

function getConfiguration() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const environment: "sandbox" | "production" = process.env.CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox";
  if (!clientId || !clientSecret) throw new Error("Cashfree credentials are not configured.");
  return { clientId, clientSecret, environment };
}

function getApiBase(environment: "sandbox" | "production") {
  return environment === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

async function cashfreeRequest(path: string, init: RequestInit = {}) {
  const configuration = getConfiguration();
  const response = await fetch(`${getApiBase(configuration.environment)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-version": "2023-08-01",
      "x-client-id": configuration.clientId,
      "x-client-secret": configuration.clientSecret,
      ...init.headers,
    },
  });
  const data = await response.json() as CashfreeOrder;
  if (!response.ok) throw new Error(data.message || "Cashfree request failed.");
  return { data, environment: configuration.environment };
}

export async function createCashfreeOrder(input: { orderId: string; amount: number; customerName: string; customerPhone: string; customerEmail?: string; returnUrl: string; shipping: number; courierId: number }) {
  const { data, environment } = await cashfreeRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: { customer_id: input.customerPhone, customer_name: input.customerName, customer_phone: input.customerPhone, customer_email: input.customerEmail || undefined },
      order_meta: { return_url: input.returnUrl },
      order_tags: { shipping: String(input.shipping), courier_id: String(input.courierId) },
    }),
  });
  if (!data.order_id || !data.payment_session_id) throw new Error(data.message || "Cashfree did not create a payment session.");
  return { orderId: data.order_id, paymentSessionId: data.payment_session_id, environment };
}

export async function getCashfreeOrder(orderId: string) {
  const { data } = await cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
  return data;
}

// Returns the payment method string (upi, card, netbanking, wallet, etc.) for the first successful payment
export async function getCashfreePaymentMethod(orderId: string): Promise<string> {
  try {
    const { data } = await cashfreeRequest(`/orders/${encodeURIComponent(orderId)}/payments`);
    // The payments API returns an array
    const payments = Array.isArray(data) ? data as CashfreePayment[] : [data as CashfreePayment];
    const paid = payments.find((p) => p.payment_status === "SUCCESS");
    if (!paid?.payment_method) return "online";
    // payment_method is an object like { upi: {...} } or { card: {...} } or { netbanking: {...} }
    const method = Object.keys(paid.payment_method)[0];
    // Filter out keys that aren't real payment method types (Cashfree sometimes includes non-method keys)
    const knownMethods = ["upi", "card", "netbanking", "wallet", "emi", "cod", "paylater", "banktransfer"];
    const matched = knownMethods.find((m) => m === method);
    return matched ?? method ?? "online";
  } catch {
    return "online";
  }
}

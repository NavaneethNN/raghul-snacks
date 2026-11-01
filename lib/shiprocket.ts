import { calculatePackagingBufferKg } from "@/lib/catalog";

type ShippingQuote = { charge: number; courierId: number; courierName: string; estimatedDeliveryDays: string | null };

export type ShipmentInput = {
  orderNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  subtotal: number;
  shipping: number;
  courierId?: number | null;
  weight?: number; // Weight in kg
  length?: number; // cm
  breadth?: number; // cm
  height?: number; // cm
  lines: { product: { name: string; slug: string }; quantity: number; lineTotal: number }[];
};

export type ShiprocketOrder = {
  order_id?: number | string;
  shipment_id?: number | string;
  awb_code?: string;
  courier_name?: string;
};

type ShiprocketAwb = { response?: { data?: { awb_code?: string } }; awb_code?: string; message?: string };

const apiBase = "https://apiv2.shiprocket.in/v1/external";

export function getShiprocketConfiguration() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  const senderEmail = process.env.SHIPROCKET_SENDER_EMAIL || process.env.BREVO_ADMIN_EMAIL || "raghuldelights@gmail.com";
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!email || !password || !pickupLocation || !pickupPincode) return null;
  return { email, password, pickupLocation, senderEmail, pickupPincode };
}

export function isShiprocketConfigured(): boolean {
  return Boolean(getShiprocketConfiguration());
}

async function authenticate(configuration: NonNullable<ReturnType<typeof getShiprocketConfiguration>>) {
  const authResponse = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: configuration.email, password: configuration.password }),
  });
  const auth = (await authResponse.json()) as { token?: string; message?: string };
  if (!authResponse.ok || !auth.token) throw new Error(auth.message || "Shiprocket authentication failed.");
  return auth.token;
}

export async function getShiprocketQuote(deliveryPincode: string, weight: number, declaredValue: number): Promise<ShippingQuote | null> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) return null;
  const token = await authenticate(configuration);
  const parameters = new URLSearchParams({
    pickup_postcode: configuration.pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: String(weight),
    cod: "0",
    declared_value: String(declaredValue),
  });
  const response = await fetch(`${apiBase}/courier/serviceability/?${parameters}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = (await response.json()) as {
    data?: {
      available_courier_companies?: {
        rate?: number | string;
        courier_company_id?: number | string;
        courier_name?: string;
        etd?: string;
      }[];
    };
    message?: string;
  };
  const couriers = result.data?.available_courier_companies || [];
  const courier = couriers.reduce<typeof couriers[number] | null>((cheapest, candidate) => {
    const candidateRate = Number(candidate.rate);
    const cheapestRate = Number(cheapest?.rate);
    if (!Number.isFinite(candidateRate) || candidateRate < 0 || !Number.isFinite(Number(candidate.courier_company_id))) return cheapest;
    return !cheapest || candidateRate < cheapestRate ? candidate : cheapest;
  }, null);
  const rate = Number(courier?.rate);
  const charge = Math.round(rate * 100) / 100;
  const courierId = Number(courier?.courier_company_id);
  if (!response.ok || !Number.isFinite(charge) || charge < 0 || !Number.isFinite(courierId)) {
    throw new Error(result.message || "Delivery is unavailable for this PIN code.");
  }
  return {
    charge,
    courierId,
    courierName: courier?.courier_name || "Shiprocket courier",
    estimatedDeliveryDays: courier?.etd || null,
  };
}

export async function createShiprocketShipment(input: ShipmentInput): Promise<ShiprocketOrder | null> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) return null;
  const token = await authenticate(configuration);

  const rawWeight = input.lines.reduce((w, line) => w + line.quantity * 0.25, 0);
  const finalWeight = Math.max(
    0.1,
    input.weight ?? Math.round((rawWeight + calculatePackagingBufferKg(rawWeight)) * 100) / 100
  );

  const orderResponse = await fetch(`${apiBase}/orders/create/adhoc`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      order_id: input.orderNumber,
      order_date: new Date().toISOString().slice(0, 16).replace("T", " "),
      pickup_location: configuration.pickupLocation,
      billing_customer_name: input.customerName,
      billing_last_name: "",
      billing_address: input.address,
      billing_address_2: "",
      billing_city: input.city,
      billing_pincode: input.pincode,
      billing_state: input.state,
      billing_country: "India",
      billing_email: input.email || configuration.senderEmail,
      billing_phone: input.phone,
      shipping_is_billing: true,
      shipping_customer_name: input.customerName,
      shipping_last_name: "",
      shipping_address: input.address,
      shipping_address_2: "",
      shipping_city: input.city,
      shipping_pincode: input.pincode,
      shipping_state: input.state,
      shipping_country: "India",
      shipping_email: input.email || configuration.senderEmail,
      shipping_phone: input.phone,
      order_items: input.lines.map((line) => ({
        name: line.product.name,
        sku: line.product.slug || `sku-${line.product.name.slice(0, 8)}`,
        units: line.quantity,
        selling_price: Math.max(1, Math.round(line.lineTotal / line.quantity)),
        discount: "",
        tax: "",
        hsn: "",
      })),
      payment_method: "Prepaid",
      shipping_charges: input.shipping,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,
      sub_total: input.subtotal,
      length: input.length ?? 15,
      breadth: input.breadth ?? 15,
      height: input.height ?? 10,
      weight: finalWeight,
    }),
  });

  const order = (await orderResponse.json()) as ShiprocketOrder & { message?: string };
  if (!orderResponse.ok || !order.order_id) {
    throw new Error(order.message || "Shiprocket order creation failed.");
  }

  // If courierId is provided, assign courier and generate AWB
  let courierToAssign = input.courierId;

  // If no courierId specified, query serviceability and pick cheapest
  if (!courierToAssign) {
    try {
      const quote = await getShiprocketQuote(input.pincode, finalWeight, input.subtotal);
      if (quote?.courierId) {
        courierToAssign = quote.courierId;
      }
    } catch {
      // Non-fatal if auto-lookup fails
    }
  }

  if (!courierToAssign || !order.shipment_id) return order;

  const awbResponse = await fetch(`${apiBase}/courier/assign/awb`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ shipment_id: order.shipment_id, courier_id: courierToAssign }),
  });
  const awb = (await awbResponse.json()) as ShiprocketAwb;
  if (!awbResponse.ok) {
    throw new Error(awb.message || "Shiprocket courier assignment failed.");
  }

  return {
    ...order,
    awb_code: awb.response?.data?.awb_code || awb.awb_code || order.awb_code,
  };
}

export async function generateShiprocketLabel(shipmentId: string | number): Promise<string | null> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) return null;
  const token = await authenticate(configuration);
  const response = await fetch(`${apiBase}/courier/generate/label`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
  const data = (await response.json()) as { label_url?: string; label_created?: number };
  return data.label_url || null;
}

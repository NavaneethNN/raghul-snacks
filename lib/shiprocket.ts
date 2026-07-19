type ShippingQuote = { charge: number; courierId: number; courierName: string; estimatedDeliveryDays: string | null };

type ShipmentInput = {
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
  courierId: number | null;
  lines: { product: { name: string; slug: string }; quantity: number; lineTotal: number }[];
};

type ShiprocketOrder = { order_id?: number | string; shipment_id?: number | string; awb_code?: string };
type ShiprocketAwb = { response?: { data?: { awb_code?: string } }; awb_code?: string; message?: string }; 

const apiBase = "https://apiv2.shiprocket.in/v1/external";

function getConfiguration() {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  const senderEmail = process.env.SHIPROCKET_SENDER_EMAIL;
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!email || !password || !pickupLocation || !senderEmail || !pickupPincode) return null;
  return { email, password, pickupLocation, senderEmail, pickupPincode };
}

async function authenticate(configuration: NonNullable<ReturnType<typeof getConfiguration>>) {
  const authResponse = await fetch(`${apiBase}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: configuration.email, password: configuration.password }) });
  const auth = await authResponse.json() as { token?: string; message?: string };
  if (!authResponse.ok || !auth.token) throw new Error(auth.message || "Shiprocket authentication failed.");
  return auth.token;
}

export async function getShiprocketQuote(deliveryPincode: string, weight: number, declaredValue: number): Promise<ShippingQuote | null> {
  const configuration = getConfiguration();
  if (!configuration) return null;
  const token = await authenticate(configuration);
  const parameters = new URLSearchParams({ pickup_postcode: configuration.pickupPincode, delivery_postcode: deliveryPincode, weight: String(weight), cod: "0", declared_value: String(declaredValue) });
  const response = await fetch(`${apiBase}/courier/serviceability/?${parameters}`, { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json() as { data?: { available_courier_companies?: { rate?: number | string; courier_company_id?: number | string; courier_name?: string; etd?: string }[] }; message?: string };
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
  if (!response.ok || !Number.isFinite(charge) || charge < 0 || !Number.isFinite(courierId)) throw new Error(result.message || "Delivery is unavailable for this PIN code.");
  return { charge, courierId, courierName: courier?.courier_name || "Shiprocket courier", estimatedDeliveryDays: courier?.etd || null };
}

export async function createShiprocketShipment(input: ShipmentInput): Promise<ShiprocketOrder | null> {
  const configuration = getConfiguration();
  if (!configuration) return null;
  const token = await authenticate(configuration);
  const orderResponse = await fetch(`${apiBase}/orders/create/adhoc`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ order_id: input.orderNumber, order_date: new Date().toISOString().slice(0, 16).replace("T", " "), pickup_location: configuration.pickupLocation, billing_customer_name: input.customerName, billing_last_name: "", billing_address: input.address, billing_address_2: "", billing_city: input.city, billing_pincode: input.pincode, billing_state: input.state, billing_country: "India", billing_email: input.email || configuration.senderEmail, billing_phone: input.phone, shipping_is_billing: true, shipping_customer_name: input.customerName, shipping_last_name: "", shipping_address: input.address, shipping_address_2: "", shipping_city: input.city, shipping_pincode: input.pincode, shipping_state: input.state, shipping_country: "India", shipping_email: input.email || configuration.senderEmail, shipping_phone: input.phone, order_items: input.lines.map((line) => ({ name: line.product.name, sku: line.product.slug, units: line.quantity, selling_price: line.lineTotal / line.quantity, discount: "", tax: "", hsn: "" })), payment_method: "Prepaid", shipping_charges: input.shipping, giftwrap_charges: 0, transaction_charges: 0, total_discount: 0, sub_total: input.subtotal, length: 15, breadth: 15, height: 10, weight: Math.max(0.25, input.lines.reduce((weight, line) => weight + line.quantity * 0.25, 0)) }) });
  const order = await orderResponse.json() as ShiprocketOrder & { message?: string };
  if (!orderResponse.ok || !order.order_id) throw new Error(order.message || "Shiprocket order creation failed.");
  if (!input.courierId || !order.shipment_id) return order;
  const awbResponse = await fetch(`${apiBase}/courier/assign/awb`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shipment_id: order.shipment_id, courier_id: input.courierId }) });
  const awb = await awbResponse.json() as ShiprocketAwb;
  if (!awbResponse.ok) throw new Error(awb.message || "Shiprocket courier assignment failed.");
  return { ...order, awb_code: awb.response?.data?.awb_code || awb.awb_code || order.awb_code };
}

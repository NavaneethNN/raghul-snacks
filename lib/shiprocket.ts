import { calculatePackagingBufferKg } from "@/lib/catalog";
import { validateIndianPincode } from "@/lib/pincode";

export class UnserviceablePincodeError extends Error {
  pincode: string;
  constructor(pincode: string, message?: string) {
    super(message || `Delivery is unavailable for PIN code ${pincode}.`);
    this.name = "UnserviceablePincodeError";
    this.pincode = pincode;
  }
}

export type PincodeServiceabilityResult = {
  serviceable: boolean;
  valid: boolean;
  pincode: string;
  state?: string;
  region?: string;
  courierName?: string | null;
  estimatedDeliveryDays?: string | null;
  prepDays?: number;
  message: string;
};

type ShippingQuote = { charge: number; courierId: number; courierName: string; estimatedDeliveryDays: string | null };

export type AvailableCourier = {
  id: number;
  name: string;
  rate: number;
  etd: string | null;
  rating?: number | string | null;
  isCheapest: boolean;
  isFastest: boolean;
};

export type TrackingActivity = {
  date: string;
  status: string;
  activity: string;
  location: string;
};

export type ShiprocketTrackingResult = {
  awb: string;
  currentStatus: string;
  courierName?: string;
  estimatedDeliveryDate?: string | null;
  activities: TrackingActivity[];
  trackingUrl: string;
};

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
  courierName?: string | null;
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

let cachedAuthToken: { token: string; expiresAt: number } | null = null;
let cachedWalletBalance: { data: ShiprocketWalletResult; expiresAt: number } | null = null;

async function authenticate(configuration: NonNullable<ReturnType<typeof getShiprocketConfiguration>>) {
  const now = Date.now();
  if (cachedAuthToken && cachedAuthToken.expiresAt > now) {
    return cachedAuthToken.token;
  }

  try {
    const authResponse = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: configuration.email, password: configuration.password }),
      signal: AbortSignal.timeout(5000),
    });
    const auth = (await authResponse.json()) as { token?: string; message?: string };
    if (!authResponse.ok || !auth.token) throw new Error(auth.message || "Shiprocket authentication failed.");

    // Cache token for 24 hours (Shiprocket tokens are valid for up to 10 days)
    cachedAuthToken = {
      token: auth.token,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };
    return auth.token;
  } catch (err) {
    // If cache expired but exists, fallback to cached token on network error
    if (cachedAuthToken?.token) {
      return cachedAuthToken.token;
    }
    throw err;
  }
}

export type ShiprocketWalletResult = {
  configured: boolean;
  balance: number;
  currency: string;
  error?: string;
};

export async function getShiprocketWalletBalance(forceRefresh = false): Promise<ShiprocketWalletResult> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) {
    return { configured: false, balance: 0, currency: "INR" };
  }

  const now = Date.now();
  if (!forceRefresh && cachedWalletBalance && cachedWalletBalance.expiresAt > now) {
    return cachedWalletBalance.data;
  }

  try {
    const token = await authenticate(configuration);
    const response = await fetch(`${apiBase}/account/details/wallet-balance`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      if (cachedWalletBalance) return cachedWalletBalance.data;
      return { configured: true, balance: 0, currency: "INR", error: "Could not fetch wallet balance from Shiprocket" };
    }

    const data = await response.json();
    const rawBalance = data?.data?.balance ?? data?.data?.balance_amount ?? data?.balance ?? 0;
    const balance = typeof rawBalance === "number" ? rawBalance : parseFloat(String(rawBalance)) || 0;

    const result: ShiprocketWalletResult = {
      configured: true,
      balance: Math.round(balance * 100) / 100,
      currency: data?.data?.currency || "INR",
    };

    // Cache wallet balance for 60 seconds to avoid hammering Shiprocket and freezing page renders
    cachedWalletBalance = {
      data: result,
      expiresAt: now + 60 * 1000,
    };

    return result;
  } catch (error) {
    if (cachedWalletBalance) return cachedWalletBalance.data;
    return {
      configured: true,
      balance: 0,
      currency: "INR",
      error: error instanceof Error ? error.message : "Shiprocket wallet balance unavailable",
    };
  }
}

export async function getAvailableCouriers(
  deliveryPincode: string,
  weight: number,
  declaredValue: number,
  dimensions?: { length?: number; breadth?: number; height?: number }
): Promise<AvailableCourier[]> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) return [];
  const token = await authenticate(configuration);
  const parameters = new URLSearchParams({
    pickup_postcode: configuration.pickupPincode,
    delivery_postcode: deliveryPincode,
    weight: String(weight),
    cod: "0",
    declared_value: String(declaredValue),
  });
  if (dimensions?.length) parameters.set("length", String(dimensions.length));
  if (dimensions?.breadth) parameters.set("breadth", String(dimensions.breadth));
  if (dimensions?.height) parameters.set("height", String(dimensions.height));

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
        rating?: number | string;
        min_weight?: number | string;
        charge_weight?: number | string;
      }[];
    };
    message?: string;
  };

  const rawCouriers = result.data?.available_courier_companies || [];
  const validCouriers = rawCouriers
    .map((c) => {
      const rate = Number(c.rate);
      const id = Number(c.courier_company_id);
      const minWeight = c.min_weight !== undefined && c.min_weight !== null ? Number(c.min_weight) : undefined;
      const chargeWeight = c.charge_weight !== undefined && c.charge_weight !== null ? Number(c.charge_weight) : undefined;
      const nameSlabMatch = c.courier_name?.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|gm|gms|g)/i);
      const nameSlab = nameSlabMatch
        ? nameSlabMatch[2].toLowerCase().startsWith("g")
          ? `${Number(nameSlabMatch[1]) / 1000} kg`
          : `${nameSlabMatch[1]} kg`
        : undefined;

      const billWeight = Number.isFinite(chargeWeight)
        ? `${chargeWeight} kg`
        : Number.isFinite(minWeight)
        ? `${minWeight} kg`
        : nameSlab;

      return {
        id,
        name: c.courier_name || "Courier Partner",
        rate: Math.round(rate * 100) / 100,
        etd: c.etd || null,
        rating: c.rating ?? null,
        minWeight: Number.isFinite(minWeight) ? minWeight : undefined,
        chargeWeight: Number.isFinite(chargeWeight) ? chargeWeight : undefined,
        billWeight,
      };
    })
    .filter((c) => Number.isFinite(c.rate) && c.rate > 0 && Number.isFinite(c.id));

  if (validCouriers.length === 0) return [];

  // Sort by rate ascending
  validCouriers.sort((a, b) => a.rate - b.rate);
  const minRate = validCouriers[0].rate;

  return validCouriers.map((c, index) => ({
    ...c,
    etd: adjustEstimatedDelivery(c.etd, weight),
    isCheapest: c.rate === minRate,
    isFastest: index === 0 && Boolean(c.etd?.toLowerCase().includes("1") || c.name.toLowerCase().includes("air")),
  }));
}

export function adjustEstimatedDelivery(etd: string | null | undefined, weightKg: number): string | null {
  const prepDays = weightKg > 3 ? 3 : 2;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (!etd || typeof etd !== "string" || !etd.trim()) {
    return `${2 + prepDays}–${5 + prepDays} business days`;
  }

  const trimmed = etd.trim();

  // 1. Try parsing as a specific calendar date (e.g. 'Nov 04, 2026', '2026-11-04')
  const parsedDate = new Date(trimmed);
  if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2024) {
    parsedDate.setDate(parsedDate.getDate() + prepDays);
    const m = months[parsedDate.getMonth()];
    const d = String(parsedDate.getDate()).padStart(2, "0");
    const y = parsedDate.getFullYear();
    return `${m} ${d}, ${y}`;
  }

  // 2. Try range format: e.g. '2–3 business days', '3-5 days', '2 to 4 days'
  const rangeMatch = trimmed.match(/^(\d+)\s*(?:–|-|to)\s*(\d+)\s*(.*)$/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10) + prepDays;
    const max = parseInt(rangeMatch[2], 10) + prepDays;
    const unit = rangeMatch[3].trim() || "business days";
    return `${min}–${max} ${unit}`;
  }

  // 3. Try single day format: e.g. '3 days', '4 business days'
  const singleMatch = trimmed.match(/^(\d+)\s*(.*)$/i);
  if (singleMatch && /day/i.test(singleMatch[2])) {
    const days = parseInt(singleMatch[1], 10) + prepDays;
    const unit = singleMatch[2].trim() || "business days";
    return `${days} ${unit}`;
  }

  return `${2 + prepDays}–${5 + prepDays} business days`;
}

export function cleanCourierName(name?: string | null): string {
  if (!name) return "Courier Delivery";
  return (
    name
      .replace(/(?:^|[\s\(\[\{—\-])\d+(\.\d+)?\s*(kg|kgs|gm|gms|g)\b[\)\]\}]?/gi, "")
      .replace(/\s*-\s*$/, "")
      .replace(/\s{2,}/g, " ")
      .trim() || name || "Courier Delivery"
  );
}

const serviceabilityCache = new Map<string, { data: PincodeServiceabilityResult; expiresAt: number }>();

export async function checkPincodeServiceability(
  deliveryPincode: string,
  weightKg = 0.5
): Promise<PincodeServiceabilityResult> {
  const cleanPin = (deliveryPincode || "").trim();
  const validation = validateIndianPincode(cleanPin);
  if (!validation.valid) {
    return {
      serviceable: false,
      valid: false,
      pincode: cleanPin,
      message: validation.error || "Please enter a valid 6-digit Indian PIN code.",
    };
  }

  const cacheKey = `${cleanPin}_${weightKg}`;
  const now = Date.now();
  const cached = serviceabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const prepDays = weightKg > 3 ? 3 : 2;
  const isTN = validation.state?.toLowerCase() === "tamil nadu";
  const isSouth = ["tamil nadu", "kerala", "karnataka", "andhra pradesh", "telangana"].includes(
    (validation.state || "").toLowerCase()
  );
  const fallbackEstimate = isTN
    ? `${2 + prepDays}–${3 + prepDays} business days`
    : isSouth
    ? `${3 + prepDays}–${5 + prepDays} business days`
    : `${4 + prepDays}–${7 + prepDays} business days`;

  const configuration = getShiprocketConfiguration();

  // If Shiprocket is not configured, rely on Indian postal network routing
  if (!configuration) {
    const res: PincodeServiceabilityResult = {
      serviceable: true,
      valid: true,
      pincode: cleanPin,
      state: validation.state,
      region: validation.region,
      courierName: isTN ? "Express Courier" : "Standard Courier",
      estimatedDeliveryDays: fallbackEstimate,
      prepDays,
      message: `Available for delivery to ${cleanPin} (${validation.state}) · Estimated delivery: ${fallbackEstimate} (includes ${prepDays} days fresh preparation & packing)`,
    };
    serviceabilityCache.set(cacheKey, { data: res, expiresAt: now + 5 * 60 * 1000 });
    return res;
  }

  try {
    const couriers = await getAvailableCouriers(cleanPin, weightKg, 300);
    if (couriers.length > 0) {
      const best = couriers.find((c) => c.isCheapest) || couriers[0];
      const res: PincodeServiceabilityResult = {
        serviceable: true,
        valid: true,
        pincode: cleanPin,
        state: validation.state,
        region: validation.region,
        courierName: cleanCourierName(best.name),
        estimatedDeliveryDays: best.etd || fallbackEstimate,
        prepDays,
        message: `Available for delivery to ${cleanPin} (${validation.state}) · Estimated delivery: ${best.etd || fallbackEstimate} (includes ${prepDays} days fresh preparation & packing)`,
      };
      serviceabilityCache.set(cacheKey, { data: res, expiresAt: now + 5 * 60 * 1000 });
      return res;
    } else {
      // Shiprocket checked and returned 0 couriers: this PIN is NOT serviceable by courier!
      const res: PincodeServiceabilityResult = {
        serviceable: false,
        valid: true,
        pincode: cleanPin,
        state: validation.state,
        region: validation.region,
        prepDays,
        message: `Delivery is currently not available to PIN code ${cleanPin} (${validation.state}). We are expanding our coverage soon.`,
      };
      serviceabilityCache.set(cacheKey, { data: res, expiresAt: now + 5 * 60 * 1000 });
      return res;
    }
  } catch (err) {
    if (err instanceof UnserviceablePincodeError) {
      const res: PincodeServiceabilityResult = {
        serviceable: false,
        valid: true,
        pincode: cleanPin,
        state: validation.state,
        region: validation.region,
        prepDays,
        message: `Delivery is currently not available to PIN code ${cleanPin} (${validation.state}). We are expanding our coverage soon.`,
      };
      serviceabilityCache.set(cacheKey, { data: res, expiresAt: now + 5 * 60 * 1000 });
      return res;
    }

    console.warn(`[checkPincodeServiceability] Shiprocket lookup failed for ${cleanPin}, falling back:`, err);
    const res: PincodeServiceabilityResult = {
      serviceable: true,
      valid: true,
      pincode: cleanPin,
      state: validation.state,
      region: validation.region,
      courierName: isTN ? "Express Courier" : "Standard Courier",
      estimatedDeliveryDays: fallbackEstimate,
      prepDays,
      message: `Delivery estimated in ${fallbackEstimate} for ${cleanPin} (${validation.state}) (includes ${prepDays} days fresh preparation & packing)`,
    };
    return res;
  }
}

export async function getShiprocketQuote(
  deliveryPincode: string,
  weight: number,
  declaredValue: number,
  dimensions?: { length?: number; breadth?: number; height?: number }
): Promise<ShippingQuote | null> {
  const couriers = await getAvailableCouriers(deliveryPincode, weight, declaredValue, dimensions);
  if (couriers.length === 0) {
    const configuration = getShiprocketConfiguration();
    if (!configuration) return null;
    throw new UnserviceablePincodeError(deliveryPincode, `Delivery is unavailable for PIN code ${deliveryPincode}.`);
  }
  const cheapest = couriers.find((c) => c.isCheapest) || couriers[0];
  return {
    charge: cheapest.rate,
    courierId: cheapest.id,
    courierName: cleanCourierName(cheapest.name),
    estimatedDeliveryDays: cheapest.etd,
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
  let assignedCourierName = input.courierName;

  // If no courierId specified, query serviceability and pick cheapest
  if (!courierToAssign) {
    try {
      const quote = await getShiprocketQuote(input.pincode, finalWeight, input.subtotal, {
        length: input.length,
        breadth: input.breadth,
        height: input.height,
      });
      if (quote?.courierId) {
        courierToAssign = quote.courierId;
        assignedCourierName = quote.courierName;
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
    courier_name: assignedCourierName || order.courier_name,
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

export async function getShiprocketTracking(awbCode: string): Promise<ShiprocketTrackingResult> {
  const trackingUrl = `https://shiprocket.co/tracking/${encodeURIComponent(awbCode)}`;
  const configuration = getShiprocketConfiguration();
  if (!configuration) {
    return {
      awb: awbCode,
      currentStatus: "Dispatched",
      activities: [],
      trackingUrl,
    };
  }

  try {
    const token = await authenticate(configuration);
    const response = await fetch(`${apiBase}/courier/track/awb/${encodeURIComponent(awbCode)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      return {
        awb: awbCode,
        currentStatus: "Dispatched",
        activities: [],
        trackingUrl,
      };
    }
    const data = (await response.json()) as {
      tracking_data?: {
        shipment_track?: Array<{
          current_status?: string;
          courier_name?: string;
          edd?: string;
        }>;
        shipment_track_activities?: Array<{
          date?: string;
          status?: string;
          activity?: string;
          location?: string;
        }>;
      };
    };

    const track = data.tracking_data?.shipment_track?.[0];
    const rawActivities = data.tracking_data?.shipment_track_activities || [];
    const activities: TrackingActivity[] = rawActivities.map((a) => ({
      date: a.date || "",
      status: a.status || "",
      activity: a.activity || "",
      location: a.location || "",
    }));

    return {
      awb: awbCode,
      currentStatus: track?.current_status || "In Transit",
      courierName: track?.courier_name,
      estimatedDeliveryDate: track?.edd || null,
      activities,
      trackingUrl,
    };
  } catch (err) {
    console.warn("[shiprocket] Tracking lookup failed for AWB", awbCode, err);
    return {
      awb: awbCode,
      currentStatus: "Dispatched",
      activities: [],
      trackingUrl,
    };
  }
}

/**
 * Cancels an AWB on Shiprocket.
 * Automatically voids the courier booking and initiates a wallet balance refund.
 * Must be requested before the courier partner physically picks up the parcel.
 */
export async function cancelShiprocketAwb(
  awbCode: string
): Promise<{ success: boolean; message?: string }> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) {
    return { success: false, message: "Shiprocket is not configured." };
  }

  try {
    const token = await authenticate(configuration);
    const response = await fetch(`${apiBase}/orders/cancel/shipment/awbs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ awbs: [awbCode.trim()] }),
    });

    const data = (await response.json()) as { message?: string };
    if (!response.ok) {
      console.warn("[shiprocket] cancel AWB warning:", data);
      return { success: false, message: data.message || "Failed to cancel AWB on Shiprocket." };
    }
    return { success: true, message: data.message || "Shipment AWB cancelled successfully." };
  } catch (err) {
    console.error("[shiprocket] cancel AWB error:", err);
    return { success: false, message: err instanceof Error ? err.message : "Error cancelling AWB." };
  }
}

/**
 * Cancels a Shiprocket order by internal Shiprocket order ID.
 */
export async function cancelShiprocketOrder(
  orderId: number | string
): Promise<{ success: boolean; message?: string }> {
  const configuration = getShiprocketConfiguration();
  if (!configuration) {
    return { success: false, message: "Shiprocket is not configured." };
  }

  try {
    const token = await authenticate(configuration);
    const response = await fetch(`${apiBase}/orders/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: [orderId] }),
    });

    const data = (await response.json()) as { message?: string };
    return { success: response.ok, message: data.message };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Error cancelling order." };
  }
}

export { getCourierTrackingUrl } from "@/lib/shipping-utils";



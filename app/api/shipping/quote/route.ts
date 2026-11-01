import { NextResponse } from "next/server";
import { z } from "zod";
import { priceOrder } from "@/lib/order-pricing";
import { getShiprocketQuote } from "@/lib/shiprocket";
import { getDb } from "@/lib/db";
import { settings } from "@/drizzle/schema";

const payloadSchema = z
  .object({
    pincode: z.string().regex(/^\d{6}$/).optional(),
    state: z.string().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().min(1).max(20),
        })
      )
      .min(1)
      .max(20),
  })
  .refine((data) => Boolean(data.pincode || data.state), {
    message: "Enter a valid PIN code or state to calculate delivery.",
  });

export async function POST(request: Request) {
  const payload = payloadSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json(
      { error: "Enter a valid 6-digit PIN code to calculate delivery." },
      { status: 400 }
    );
  }

  try {
    const { subtotal, weight, rawSnackWeightKg, packagingBufferKg } = await priceOrder(payload.data.items);
    const deliveryMode = process.env.DELIVERY_MODE || "automated";

    // ── 1. Automated Minimum Shiprocket Courier ──────────────────────────────
    if (deliveryMode !== "manual" && payload.data.pincode) {
      try {
        const quote = await getShiprocketQuote(payload.data.pincode, weight, subtotal);
        if (quote) {
          const platformFee = 2;
          const actualCharge = quote.charge;
          const chargedShipping = Math.round((actualCharge + platformFee) * 100) / 100;

          return NextResponse.json({
            charge: chargedShipping,
            actualCharge,
            platformFee,
            courierId: quote.courierId,
            courierName: quote.courierName,
            estimatedDeliveryDays: quote.estimatedDeliveryDays,
            subtotal,
            total: Math.round((subtotal + chargedShipping) * 100) / 100,
            weightKg: weight,
            rawSnackWeightKg,
            packagingBufferKg,
            source: "shiprocket_automated",
          });
        }
      } catch (shiprocketErr) {
        console.warn(
          `[shipping/quote] Live Shiprocket rate unavailable for PIN ${payload.data.pincode}, applying regional fallback:`,
          shiprocketErr instanceof Error ? shiprocketErr.message : shiprocketErr
        );
      }
    }

    // ── 2. Regional / Manual Fallback from DB Settings ────────────────────────
    let tnRate = 60;
    let southRate = 100;
    let northRate = 250;
    let extraRate = 30;

    try {
      const db = getDb();
      const allSettings = await db.select().from(settings);
      const s: Record<string, string> = {};
      allSettings.forEach((row) => {
        s[row.key] = row.value;
      });
      if (s.shippingTamilNadu) tnRate = parseInt(s.shippingTamilNadu, 10);
      if (s.shippingSouthIndia) southRate = parseInt(s.shippingSouthIndia, 10);
      if (s.shippingNorthIndia) northRate = parseInt(s.shippingNorthIndia, 10);
      if (s.shippingExtraKg) extraRate = parseInt(s.shippingExtraKg, 10);
    } catch {
      // Use defaults if settings table is temporarily inaccessible
    }

    const stateNorm = (payload.data.state || "").trim().toLowerCase();
    const isTN = stateNorm === "tamil nadu";
    const isSouth = ["kerala", "karnataka", "andhra pradesh", "telangana"].includes(stateNorm);

    let baseRate: number;
    let courierLabel: string;
    if (isTN) {
      baseRate = tnRate;
      courierLabel = "Surface Delivery";
    } else if (isSouth) {
      baseRate = southRate;
      courierLabel = "Express Delivery";
    } else {
      baseRate = northRate;
      courierLabel = "Air Delivery";
    }

    const totalWeightKg = Math.max(1, weight);
    const extraKg = Math.ceil(Math.max(0, totalWeightKg - 1));
    const actualCharge = baseRate + extraKg * extraRate;
    const platformFee = 2;
    const chargedShipping = actualCharge + platformFee;

    return NextResponse.json({
      charge: chargedShipping,
      actualCharge,
      platformFee,
      courierId: null,
      courierName: courierLabel,
      estimatedDeliveryDays: isTN ? "2–3 business days" : isSouth ? "3–5 business days" : "4–7 business days",
      subtotal,
      total: Math.round((subtotal + chargedShipping) * 100) / 100,
      weightKg: weight,
      rawSnackWeightKg,
      packagingBufferKg,
      source: "regional_settings",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate delivery charges.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
